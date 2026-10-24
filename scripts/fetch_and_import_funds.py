#!/usr/bin/env python3
"""
fund_scores 全量抓取 + Supabase 导入脚本
1. 从天天基金 FundGuideapi 拉取全量基金（5大分类）
2. 全市场统一排名计算靠谱指数（v5: 收益60%+回撤30%+夏普10%）
   - 无风险指标时，仅用收益排位计算（归一化到100分）
3. 通过 Supabase REST API 批量导入

注意：风险指标（回撤+夏普）需单独运行 fetch_risk_indicators.py 后重新计算
"""
import json
import subprocess
import time
import math
import sys
import os
import re
import argparse
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# ===== 配置（从环境变量读取，GitHub Actions 通过 Secrets 注入）=====
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://tqhtegazxykkqfcpejky.supabase.co')
ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
MGMT_TOKEN = os.environ.get('SUPABASE_MGMT_TOKEN', '')
SUPABASE_PROJECT_REF = os.environ.get('SUPABASE_PROJECT_REF', 'tqhtegazxykkqfcpejky')
MGMT_API = f'https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/database/query'

# 脚本目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# 验证必要的环境变量
if not ANON_KEY and not MGMT_TOKEN:
    print('ERROR: 缺少凭证！请设置环境变量 SUPABASE_ANON_KEY 和 SUPABASE_MGMT_TOKEN')
    sys.exit(1)
if not MGMT_TOKEN:
    print('WARNING: 未设置 SUPABASE_MGMT_TOKEN，跳过数据库写入操作')
if not ANON_KEY:
    print('WARNING: 未设置 SUPABASE_ANON_KEY')

FT_MAP = {
    'gp': '股票型基金',
    'zq': '债券型基金',
    'hh': '混合型基金',
    'fof': 'FOF',
    'qdii': 'QDII基金',
}
FT_LIST = list(FT_MAP.keys())

# 整类抓取重试（根治上游瞬时空响应：某大类首页返回空 datas 致 staging 该大类=0、
# promote 校验 80% 阈值整批拒绝、流水线直接挂掉。历史已发生多次：8/19 股票型、10/17 混合型）。
# 首页即空或中页空且未达声明总数 → 判为上游瞬时抽风，整类指数退避重试最多 FT_MAX_RETRY 次；
# 重试耗尽仍空 → 整类返回 0（交由 promote 守卫兜底，不再静默吞掉）。
FT_MAX_RETRY = 3
FT_RETRY_BASE_DELAY = 15  # 秒，指数退避基数（attempt×BASE）

# ── 抓取完整性（2026-10-24 补齐「没拉满就报数据拉取错误」这一环）──
# 背景：此前抓取阶段只管翻页，不做「实际 vs 上游声明总数」核对，抓少了照样写
# NDJSON → 进 staging → 最后由 promote 按「分类数量」维度拦下，报错才长成
# 「分类灾难性丢失」，看起来像分类/类型问题，实为数据没拉满。正确链路应是：
#   拉多少存多少 → 未拉满即报「数据拉取失败」直接退出 → 拉满才进评分 → 计算完才切生产
# 比例阈值：留 2% 容差，应对上游当日的少量新发/清盘与跨类重复代码去重。
FT_COMPLETE_RATIO = 0.98
# QDII 走「主列表名单 + pingzhongdata 逐只取数」，个别基金无 pingzhongdata 是常态，
# 单独放宽到 90%，避免正常解析失败被误判为「数据拉取失败」。
QDII_COMPLETE_RATIO = 0.90
# 各类完整性登记：{ft: {'got': int, 'declared': int}}，由 main 汇总校验
FETCH_COMPLETENESS = {}

def _float(v):
    try:
        return float(v) if v and v.strip() and v.strip() != '' else 0
    except:
        return 0


# 阶段收益字段中，东财/天天基金接口常用 '0' / '0.0' / '-' / '--' 作为「该期限无数据」
# 的占位（并非真实 0% 收益）。这些必须当作「缺失」处理，否则会被当 0% 排名打分，
# 造成「无业绩却有评分」。注：负收益（如 '-35.79'）是真实值，保留。
_MISSING_RETURN_TOKENS = {'', '0', '0.0', '-', '--', '---', '—', '—'}


def _return_float(v):
    """阶段收益字段专用转换：空/None/'0'/'0.0'/'-'/'--'/'---' → None（表示「无该期限业绩」，
    不参与评分排名）；有效数值（含真实负收益）→ float。
    与 _float 的关键区别：_float 把空串转成 0，且本函数此前把 '0' 当真实 0% 收益，
    二者都导致缺失收益被纳入排名，产生「无业绩却有评分」的展示 bug。"""
    if v is None:
        return None
    s = str(v).strip()
    if s in _MISSING_RETURN_TOKENS:
        return None
    try:
        return float(s)
    except Exception:
        return None


def _null_float(v):
    """Convert to float, return None if invalid"""
    try:
        val = float(v)
        return val if val != 0 else None
    except:
        return None


def _curl_json(url, tries=3, delay=5, timeout=20):
    """带重试的 curl JSON 拉取。遇到无响应/解析失败/异常自动重试，根除上游瞬时抽风
    （如 8/19 评分流水线因 ft=gp 接口瞬时返回空、导致 staging 股票型=0、promote 校验拒绝）。

    容错增强（2026-10-21）：上游偶发返回截断/乱码字节流——混合型基金(hh) 曾因 5000/页 响应
    在 376KB 处被截断、缺闭合 `}` 致 `'utf-8' codec can't decode`（text=True 崩溃）+ 重试耗尽后
    **静默跳过整类**，staging 混合型=0、promote 守卫整批拒绝、流水线报错。改为：
      - 捕字节而非 text，按 utf-8/ignore 容错解码（截断/乱码字节不抛异常）；
      - JSON 结构不完整（缺 `}`）判为截断并重试，避免假失败吞掉整类数据。
    """
    for attempt in range(1, tries + 1):
        try:
            result = subprocess.run(
                ['curl', '-s', '--max-time', str(timeout),
                 '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                 '-H', 'Referer: https://fund.eastmoney.com/', url],
                capture_output=True, timeout=timeout + 5
            )
            # 捕字节 + 容错解码：截断/乱码字节不抛异常，交给 json.loads 判定完整性
            text = result.stdout.decode('utf-8', errors='ignore')
            if not text or '{' not in text:
                print(f'  (第{attempt}/{tries}次) 无响应/非JSON')
                if attempt < tries:
                    time.sleep(delay)
                    continue
                return None
            s = text.find('{')
            e = text.rfind('}') + 1
            if s < 0 or e <= s:
                print(f'  (第{attempt}/{tries}次) 括号定位失败(疑似截断)')
                if attempt < tries:
                    time.sleep(delay)
                    continue
                return None
            return json.loads(text[s:e])
        except Exception as e:
            print(f'  (第{attempt}/{tries}次) 异常: {e}')
            if attempt < tries:
                time.sleep(delay)
                continue
            return None
    return None


def _fetch_page(ft, pi, pn):
    """抓取单页（指定分页大小 pn），返回解析后的 dict 或 None。"""
    url = (
        'https://fund.eastmoney.com/data/FundGuideapi.aspx?dt=0&ft=' + ft +
        '&sd=&ed=&sc=3nzf&st=desc&pi=' + str(pi) + '&pn=' + str(pn) + '&zf=diy&sh=list'
    )
    return _curl_json(url)


def fetch_funds(ft, attempt=1):
    """从天天基金拉取指定分类的全部基金（用 curl 避免被限速）。

    健壮性：
     - 默认分页 pn=2500（偏大分页易触发上游截断：混合型基金(hh) 曾因 5000/页 响应在 376KB
       处被截断、缺闭合 } 致重试耗尽整类静默跳过）。
     - 单页抓取失败先回退更小分页（pn=1000）重试，降低截断概率。
     - 首页整页失败：整类指数退避重试最多 FT_MAX_RETRY 次；仍失败才返回空列表
       （交由 promote 守卫兜底），不再静默吞掉整类数据。
     - 空响应兜底（根治上游瞬时抽风致某大类=0、promote 整批拒绝）：首页即空或中页空且
       未达声明总数，整类指数退避重试最多 FT_MAX_RETRY 次；重试耗尽仍空则整类返回 0。
    """
    all_funds = []
    pn = 2500
    # 上游声明的该分类总数：任何页给出 >0 的 datacount 都记住（取最大）。
    # 关键修复（2026-10-24）：此前空响应兜底与 break 终止都用「本页 datacount」，
    # 上游抽风返回 datacount=0 的空页时 total_count 被覆盖为 0 → 兜底条件
    # (total_count and ...) 恒 False 不重试，且 len(all_funds) >= 0 恒成立 →
    # 提前 break 整类截断（10/23 run：混合型声明 9774 只，第2页空响应后只抓到
    # 第1页 2500 只，staging 混合型 2143 < 50% 生产 7035，promote 拒绝切换）。
    declared_total = 0
    for pi in range(1, 12):
        print(f'  拉取 {FT_MAP[ft]}({ft}) 第{pi}页(pn={pn})...', flush=True)
        data = _fetch_page(ft, pi, pn)
        # 单页失败先回退更小分页（降截断概率），仍失败再决定整类重试/放弃
        if data is None:
            data = _fetch_page(ft, pi, 1000)
        if data is None:
            if pi == 1 and attempt < FT_MAX_RETRY:
                delay = FT_RETRY_BASE_DELAY * attempt
                print(f'  ⚠ {FT_MAP[ft]}({ft}) 首页多次抓取失败，整类重试 {attempt}/{FT_MAX_RETRY}，{delay}s 后', flush=True)
                time.sleep(delay)
                return fetch_funds(ft, attempt + 1)
            print(f'  {FT_MAP[ft]}({ft}) 第{pi}页抓取失败，停止该分类（数据不完整，交 promote 守卫兜底）')
            break
        try:
            items = data.get('datas', [])
            total_count = int(data.get('datacount', 0) or 0)
            if total_count > declared_total:
                declared_total = total_count
            # ── 空响应兜底（根治上游瞬时抽风致某大类=0、promote 整批拒绝）──
            # 用 declared_total 判断（本页 datacount=0 不可信，见上方 declared_total 注释）
            if not items and attempt < FT_MAX_RETRY and (pi == 1 or len(all_funds) < declared_total):
                delay = FT_RETRY_BASE_DELAY * attempt
                print(f'  ⚠ {FT_MAP[ft]}({ft}) 第{pi}页空响应(疑似上游抽风)，整类重试 {attempt}/{FT_MAX_RETRY}，{delay}s 后', flush=True)
                time.sleep(delay)
                return fetch_funds(ft, attempt + 1)
            if not items and pi == 1:
                print(f'  {FT_MAP[ft]}({ft}) 重试{FT_MAX_RETRY}次仍空，返回空列表(交由 promote 守卫处理)')
                FETCH_COMPLETENESS[ft] = {'got': 0, 'declared': declared_total}
                return []
            if not items:
                # 非首页空页：已抓满声明总数（正常到底）或重试耗尽 → 停止翻页
                print(f'  {FT_MAP[ft]}({ft}) 第{pi}页空响应(累计{len(all_funds)}/声明{declared_total})，停止翻页', flush=True)
                break
            for item in items:
                f = item.split(',')
                if len(f) < 13:
                    continue
                code = f[0].strip() + '.OF'
                name = (f[1] or '').strip()
                # 分类完全由天天基金 FundGuideapi 的 f[3]（「一级-二级」结构，如 指数型-股票）派生；
                # 旧「聚源分类」已废弃删除。f[3] 为空时回落到 FT_MAP[ft] 初值（与 import_via_rest step 2g 兜底一致）。
                t0 = (f[3].split('-')[0] if f[3] else FT_MAP[ft])
                t1 = (f[3] if f[3] else FT_MAP[ft])
                # 天天基金 FundGuideapi 的 ft 是权威一级分类：QDII 类基金必须保留 QDII 一级，
                # 不可被聚源映射/指数型子类覆盖（否则 QDII 数量骤降、promote 校验整批拒绝）。
                # 仅当聚源已给出 QDII-* 子类时保留其细分，否则强制归一为 QDII。
                if ft == 'qdii' and not str(t0).startswith('QDII'):
                    t0 = 'QDII'
                    t1 = 'QDII基金'
                # 申购状态: f[18] (1=可申购, 0=暂停申购)
                sg_val = None
                if len(f) > 18 and f[18].strip():
                    try: sg_val = int(f[18].strip())
                    except: pass
                # 日涨跌幅: f[17]
                daily_val = None
                if len(f) > 17 and f[17].strip():
                    try: daily_val = float(f[17].strip())
                    except: pass
                all_funds.append({
                    'c': code,
                    'n': name,
                    't0': t0,
                    't1': t1,
                    't1_tt': (f[3] or '').strip(),  # 天天基金 API 原始 t2 分类值
                    't2': (f[3] or '').strip(),
                    't6': '',
                    'a': 0,
                    'hp': 0,
                    'sg': sg_val,
                    'daily_change': daily_val,
                    'ytd': _return_float(f[4]),
                    'r0w': _return_float(f[5]),
                    'r1m': _return_float(f[6]),
                    'r3m': _return_float(f[7]),
                    'r6m': _return_float(f[8]),
                    'r1y': _return_float(f[9]),
                    'r2y': _return_float(f[10]),
                    'r3y': _return_float(f[11]),
                    'r5y': _return_float(f[12]),
                    'nav': _return_float(f[16]) if len(f) > 16 else None,
                    'date': f[15].strip() if len(f) > 15 else '',
                })
            print(f' +{len(items)}条 (总计{declared_total}, 累计{len(all_funds)})')
            if declared_total and len(all_funds) >= declared_total:
                break
            if len(items) < pn:
                if not declared_total or len(all_funds) >= declared_total:
                    break
                # 短页但尚未抓满声明总数：上游分页不齐/轻微截断，继续翻下一页
                print(f'  ⓘ 第{pi}页短页({len(items)}<{pn})且累计{len(all_funds)}<声明{declared_total}，继续翻页', flush=True)
        except Exception as e:
            print(f' 异常: {e}')
            break
        time.sleep(0.5)

    # ── 拉满校验：翻页结束后核对「实际抓到 / 上游声明总数」──
    # 未达阈值先整类指数退避重试（上游间歇抽风多发于此），重试耗尽仍不足则登记
    # 实际值，由 main 判定「数据拉取失败」直接退出——不带残缺数据进评分/staging/切换。
    if declared_total and len(all_funds) < declared_total * FT_COMPLETE_RATIO:
        ratio = len(all_funds) / declared_total * 100
        if attempt < FT_MAX_RETRY:
            delay = FT_RETRY_BASE_DELAY * attempt
            print(f'  ⚠ {FT_MAP[ft]}({ft}) 未拉满: 实际{len(all_funds)}/声明{declared_total} ({ratio:.1f}%)，'
                  f'整类重试 {attempt}/{FT_MAX_RETRY}，{delay}s 后', flush=True)
            time.sleep(delay)
            return fetch_funds(ft, attempt + 1)
        print(f'  ✗ {FT_MAP[ft]}({ft}) 未拉满（已重试{FT_MAX_RETRY}次）: '
              f'实际{len(all_funds)}/声明{declared_total} ({ratio:.1f}%)', flush=True)
    else:
        print(f'  ✓ {FT_MAP[ft]}({ft}) 已拉满: {len(all_funds)}/{declared_total or len(all_funds)}', flush=True)
    FETCH_COMPLETENESS[ft] = {'got': len(all_funds), 'declared': declared_total}
    return all_funds


def calc_scores_v5(funds):
    """
    v5 靠谱指数计算（全市场统一排名百分位×100）
    权重：收益排位×60% + 回撤排位×30% + 夏普排位×10%
    
    无风险指标时，仅用收益排位（100分制）
    有风险指标时，三指标加权
    
    所有基金均参与评分（不再要求收益率>0）
    收益率字段：r0w(近1周), r1m(近1月), r3m(近3月), r6m(近6月), r1y(近1年), r2y(近2年), r3y(近3年), r5y(近5年)
    靠谱分字段：k0w(近1周), k1m(近1月), k3m(近3月), k6m(近6月), k1(近1年), k2(近2年), k3(近3年), k5(近5年)
    k7/k10→暂无数据
    """
    periods = [
        {'k': 'k0w', 'r': 'r0w', 'dd': None, 'sr': None},
        {'k': 'k1m', 'r': 'r1m', 'dd': None, 'sr': None},
        {'k': 'k3m', 'r': 'r3m', 'dd': None, 'sr': None},
        {'k': 'k6m', 'r': 'r6m', 'dd': None, 'sr': None},
        {'k': 'k1',  'r': 'r1y', 'dd': 'dd1y', 'sr': 'sr1y'},
        {'k': 'k2',  'r': 'r2y', 'dd': 'dd2y', 'sr': 'sr2y'},
        {'k': 'k3',  'r': 'r3y', 'dd': 'dd3y', 'sr': 'sr3y'},
        {'k': 'k5',  'r': 'r5y', 'dd': 'dd5y', 'sr': 'sr5y'},
    ]
    W_RET = 0.60
    W_DD = 0.30
    W_SR = 0.10

    total_scored = 0

    for period in periods:
        pk, rk, dk, sk = period['k'], period['r'], period['dd'], period['sr']
        # 仅收益率非空的基金参与该周期排名；缺失收益率的基金 k 分保持 NULL
        valid = [(i, funds[i]) for i in range(len(funds)) if funds[i].get(rk) is not None]
        if not valid:
            continue

        valid_n = len(valid)
        # 收益排位（降序，越高越好）
        ret_ranked = sorted(valid, key=lambda x: x[1][rk], reverse=True)
        ret_pct = {}
        for rank, (idx, fund) in enumerate(ret_ranked):
            ret_pct[idx] = (1 - rank / (valid_n - 1)) * 100 if valid_n > 1 else 50.0

        # 回撤排位（dd降序，越大越好；仅长周期有）
        dd_pct = {}
        if dk:
            dd_ranked = sorted(valid, key=lambda x: x[1].get(dk, -999) or -999, reverse=True)
            for rank, (idx, fund) in enumerate(dd_ranked):
                val = fund.get(dk)
                dd_pct[idx] = (1 - rank / (valid_n - 1)) * 100 if valid_n > 1 else (50.0 if val is not None else None)

        # 夏普排位（降序，越高越好；仅长周期有）
        sr_pct = {}
        if sk:
            sr_ranked = sorted(valid, key=lambda x: x[1].get(sk, -999) or -999, reverse=True)
            for rank, (idx, fund) in enumerate(sr_ranked):
                val = fund.get(sk)
                sr_pct[idx] = (1 - rank / (valid_n - 1)) * 100 if valid_n > 1 else (50.0 if val is not None else None)

        for idx, fund in valid:
            rp = ret_pct.get(idx)
            dp = dd_pct.get(idx) if dk else None
            sp = sr_pct.get(idx) if sk else None

            if dp is not None and sp is not None:
                # 三指标加权
                score = round(W_RET * rp + W_DD * dp + W_SR * sp, 4)
            else:
                # 短周期仅收益排位，或长周期无风险指标时仅收益排位
                score = round(rp, 4)

            if score is not None:
                fund[pk] = score
                if fund.get(pk, 0) > 0:
                    total_scored += 1

    return total_scored


def run_mgmt_sql(sql):
    """通过 Management API 执行 SQL（用 curl）"""
    payload = json.dumps({'query': sql})
    result = subprocess.run(
        ['curl', '-s', '-X', 'POST', MGMT_API,
         '-H', f'Authorization: Bearer {MGMT_TOKEN}',
         '-H', 'Content-Type: application/json',
         '-d', payload],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        raise Exception(f'curl failed: {result.stderr[:100]}')
    resp = json.loads(result.stdout)
    # Check for error in response
    if isinstance(resp, dict) and resp.get('message'):
        raise Exception(resp['message'][:200])
    return resp


def import_to_supabase(funds):
    """通过 Management API 批量导入 fund_scores"""
    BATCH = 100
    imported = 0

    for i in range(0, len(funds), BATCH):
        batch = funds[i:i + BATCH]
        values = []
        for r in batch:
            vals = [
                _esc(r.get('c', '')),
                _esc(r.get('n', '')),
                _esc(r.get('t0', '')),
                _esc(r.get('t1', '')),
                _esc(r.get('t2', '')),
                _esc(r.get('t6', '')),
                r.get('a', 0) or 0,
                _esc_null(r.get('hp')),
                _esc_null(r.get('sg')),
                _esc_null(r.get('daily_change')),
                _esc_null(r.get('ytd')),
                _esc_null(r.get('r0w')),
                _esc_null(r.get('r1m')),
                _esc_null(r.get('r3m')),
                _esc_null(r.get('r6m')),
                _esc_null(r.get('r1y')),
                _esc_null(r.get('r2y')),
                _esc_null(r.get('r3y')),
                _esc_null(r.get('r5y')),
                _esc_null(r.get('nav')),
                _esc(r.get('date', '')),
                _esc_null(r.get('k0w')),
                _esc_null(r.get('k1m')),
                _esc_null(r.get('k3m')),
                _esc_null(r.get('k6m')),
                _esc_null(r.get('k1')),
                _esc_null(r.get('k2')),
                _esc_null(r.get('k3')),
                _esc_null(r.get('k5')),
                _esc_null(r.get('dd1y')),
                _esc_null(r.get('dd2y')),
                _esc_null(r.get('dd3y')),
                _esc_null(r.get('dd5y')),
                _esc_null(r.get('sr1y')),
                _esc_null(r.get('sr2y')),
                _esc_null(r.get('sr3y')),
                _esc_null(r.get('sr5y')),
            ]
            values.append(f"({','.join(str(v) for v in vals)})")

        cols = 'c,n,t0,t1,t2,t6,a,hp,sg,daily_change,ytd,r0w,r1m,r3m,r6m,r1y,r2y,r3y,r5y,nav,date,k0w,k1m,k3m,k6m,k1,k2,k3,k5,dd1y,dd2y,dd3y,dd5y,sr1y,sr2y,sr3y,sr5y'
        sql = f"INSERT INTO fund_scores ({cols}) VALUES\n" + ',\n'.join(values)

        try:
            run_mgmt_sql(sql)
            imported += len(batch)
            print(f'  [{i}-{i+len(batch)}] +{len(batch)}条 (累计{imported})')
        except Exception as e:
            print(f'  [{i}-{i+len(batch)}] 错误: {str(e)[:100]}')

        time.sleep(0.2)

    return imported


def _esc(s):
    """Escape string for SQL"""
    if s is None:
        return "''"
    return "'" + str(s).replace("'", "''") + "'"


def _esc_null(v):
    """Escape nullable numeric for SQL"""
    if v is None:
        return 'NULL'
    try:
        f = float(v)
        if f == 0:
            return 'NULL'
        return str(f)
    except:
        return 'NULL'


# ── QDII 专用：主列表取名单 + pingzhongdata 逐只取指标 ─────────────────────────
# 东财批量排行接口(FundGuideapi/rankhandler) 对 QDII 取数范围被砍（现仅吐 115 只，
# 生产历史 399 只、主列表全量 742 只），导致 staging QDII 严重不足、promote 守卫误拒。
# 改用：主列表 fundcode_search.js 取全部 QDII 代码+类型 → 逐只 pingzhongdata 取净值/收益，
# 覆盖不丢、口径统一（不再混合 FundGuideapi）。
MASTER_QDII_URL = 'https://fund.eastmoney.com/js/fundcode_search.js'
PINGZHONG_URL = 'https://fund.eastmoney.com/pingzhongdata/{code}.js'

def fetch_qdii_master_codes():
    """从东财全量基金主列表取 QDII 名单（含指数型-海外股票等子类）。"""
    try:
        r = subprocess.run(
            ['curl', '-s', '--max-time', '30', '-H',
             'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', MASTER_QDII_URL],
            capture_output=True, text=True, timeout=40)
        txt = r.stdout
        m = re.search(r'var r\s*=\s*(\[.*\]);', txt, re.S)
        if not m:
            print('  ⚠ 主列表解析失败，QDII 名单为空')
            return []
        rows = re.findall(r'\["([0-9]{6})","([^"]*)","([^"]*)","([^"]*)","([^"]*)"\]', m.group(1))
        out = []
        for code, py, py2, t, py3 in rows:
            if t.startswith('QDII') or t == '指数型-海外股票' or '海外' in t or '全球' in t:
                out.append((code, t))
        return out
    except Exception as e:
        print(f'  ⚠ 主列表拉取异常: {e}')
        return []

def _qdii_fund_name(raw):
    m = re.search(r'var fS_name\s*=\s*"([^"]*)"', raw)
    return m.group(1) if m else ''

def _qdii_syl(raw, name):
    m = re.search(r'var ' + name + r'\s*=\s*"([^"]*)"', raw)
    return m.group(1) if m else ''

def _parse_pingzhong_qdii(code, t1_tt, raw):
    """解析单只 pingzhongdata，返回与 fetch_funds 同结构的 fund dict。"""
    r1m = _return_float(_qdii_syl(raw, 'syl_1y'))   # 近1月
    r3m = _return_float(_qdii_syl(raw, 'syl_3y'))   # 近3月
    r6m = _return_float(_qdii_syl(raw, 'syl_6y'))   # 近6月
    r1y = _return_float(_qdii_syl(raw, 'syl_1n'))   # 近1年
    # 其余周期由累计复权净值历史反算（口径统一）
    r0w = r2y = r3y = r5y = ytd = nav = daily_change = None
    date_str = ''
    m = re.search(r'var Data_ACWorthTrend\s*=\s*(\[\[.*?\]\]);', raw, re.S)
    if m:
        try:
            ac = json.loads(m.group(1))
            ac = [p for p in ac if len(p) == 2 and p[1] not in (None, '', 0)]
            ac.sort(key=lambda x: x[0])
            if ac:
                last_ts, last_val = ac[-1]
                def ret_over_days(days):
                    target = last_ts - int(days * 86400000)
                    prev = None
                    for p in ac:
                        if p[0] <= target:
                            prev = p
                        else:
                            break
                    return (last_val / prev[1] - 1) * 100 if prev and prev[1] else None
                r0w = ret_over_days(7)
                r2y = ret_over_days(730)
                r3y = ret_over_days(1095)
                r5y = ret_over_days(1825)
                yr = datetime.datetime.now().year
                ystart = int(datetime.datetime(yr, 1, 1).timestamp() * 1000)
                yprev = None
                for p in ac:
                    if p[0] >= ystart:
                        break
                    yprev = p
                ytd = (last_val / yprev[1] - 1) * 100 if yprev and yprev[1] else None
                nav = last_val
                date_str = datetime.datetime.fromtimestamp(last_ts / 1000).strftime('%Y-%m-%d')
        except Exception:
            pass
    # 日涨跌（单位净值序列，格式为 [{x:ts,y:val},...]）
    m2 = re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);', raw, re.S)
    if m2:
        try:
            nw = json.loads(m2.group(1))
            nw = [p for p in nw if isinstance(p, dict) and p.get('y') not in (None, '', 0)]
            if len(nw) >= 2:
                a, b = nw[-2], nw[-1]
                if a['y']:
                    daily_change = (b['y'] / a['y'] - 1) * 100
            if not date_str and nw:
                date_str = datetime.datetime.fromtimestamp(nw[-1]['x'] / 1000).strftime('%Y-%m-%d')
            if nav is None and nw:
                nav = nw[-1]['y']
        except Exception:
            pass
    return {
        'c': code + '.OF',
        'n': _qdii_fund_name(raw),
        't0': 'QDII',
        't1': t1_tt,
        't1_tt': t1_tt,
        't2': t1_tt,
        't6': '',
        'a': 0,
        'hp': 0,
        'sg': None,
        'daily_change': daily_change,
        'ytd': ytd,
        'r0w': r0w,
        'r1m': r1m,
        'r3m': r3m,
        'r6m': r6m,
        'r1y': r1y,
        'r2y': r2y,
        'r3y': r3y,
        'r5y': r5y,
        'nav': nav if nav else None,
        'date': date_str,
    }

def parse_pingzhong_qdii(code, t1_tt):
    url = PINGZHONG_URL.format(code=code)
    for _ in range(2):
        try:
            r = subprocess.run(['curl', '-s', '--max-time', '25',
                '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                '-H', 'Referer: https://fund.eastmoney.com/', url],
                capture_output=True, text=True, timeout=30)
            if r.stdout and 'fS_name' in r.stdout:
                return _parse_pingzhong_qdii(code, t1_tt, r.stdout)
        except Exception:
            pass
        time.sleep(1)
    return None

def fetch_qdii_full():
    """QDII 全量：主列表取名单(742) + pingzhongdata 逐只取指标（统一口径）。"""
    codes = fetch_qdii_master_codes()
    if not codes:
        print('  ⚠ QDII 主列表为空，回退到 FundGuideapi')
        return fetch_funds('qdii')
    print(f'  主列表 QDII 名单: {len(codes)} 只，逐只 pingzhongdata 取指标...', flush=True)
    results = []
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(parse_pingzhong_qdii, code, t): code for code, t in codes}
        done = 0
        for f in as_completed(futs):
            res = f.result()
            if res:
                results.append(res)
            done += 1
            if done % 100 == 0:
                print(f'    已处理 {done}/{len(codes)}', flush=True)
    print(f'  pingzhongdata 成功解析: {len(results)} 只')
    # 完整性登记：声明总数=主列表名单数，实际=成功解析数（main 据此判定是否拉满）
    FETCH_COMPLETENESS['qdii'] = {'got': len(results), 'declared': len(codes)}
    return results


def main():
    print('=' * 60)
    print('fund_scores 全量抓取 + Supabase 导入')
    print('=' * 60)

    # 1. 拉取天天基金全量（边拉边落盘：抓完一个类立刻写中间文件，中途失败不丢已抓部分）
    print('\n[1] 拉取天天基金全量数据...')
    raw_file = os.path.join(SCRIPT_DIR, 'funds_output_raw.ndjson')
    all_funds = []
    raw_written = 0
    with open(raw_file, 'w', encoding='utf-8') as fo:
        for ft in FT_LIST:
            if ft == 'qdii':
                funds = fetch_qdii_full()
            else:
                funds = fetch_funds(ft)
            for fund in funds:
                fo.write(json.dumps(fund, ensure_ascii=False) + '\n')
            fo.flush()          # 拉多少存多少，立即落盘
            raw_written += len(funds)
            print(f'  → 已落盘 {FT_MAP[ft]}({ft}) {len(funds)} 条（累计 {raw_written} 条）', flush=True)
            all_funds.extend(funds)
            time.sleep(0.5)
    print(f'  中间文件 {raw_file}: {raw_written} 条（未去重）')

    # 1.5 完整性校验：任何分类未拉满 → 判定「数据拉取失败」立即退出。
    #     不再让残缺数据进入评分/staging/切换，报错即「数据拉取未完成（哪个类、声明多少、
    #     实际多少）」，而不是最后 promote 的「分类灾难性丢失」。
    print('\n[1.5] 抓取完整性校验（实际 / 上游声明总数）')
    incomplete = []
    for ft in FT_LIST:
        info = FETCH_COMPLETENESS.get(ft)
        if not info:
            continue
        got, declared = info['got'], info['declared']
        if not declared:
            print(f'  - {FT_MAP[ft]}({ft}): 上游未声明总数，跳过校验（实际 {got}）')
            continue
        ratio = got / declared
        need = QDII_COMPLETE_RATIO if ft == 'qdii' else FT_COMPLETE_RATIO
        if ratio < need:
            incomplete.append((ft, got, declared, ratio * 100))
            print(f'  ✗ {FT_MAP[ft]}({ft}): 未拉满 实际 {got} / 声明 {declared} ({ratio*100:.1f}%)')
        else:
            print(f'  ✓ {FT_MAP[ft]}({ft}): 已拉满 实际 {got} / 声明 {declared} ({ratio*100:.1f}%)')
    if incomplete:
        print('\n' + '=' * 60)
        print('  ✗ 数据拉取失败：以下分类未拉满，终止本次运行（不写入 staging、不切换生产）')
        for ft, got, declared, pct in incomplete:
            print(f'     - {FT_MAP[ft]}({ft}): {got}/{declared} ({pct:.1f}%)')
        print('  说明: 已抓部分保留在中间文件 funds_output_raw.ndjson；'
              '生产 fund_scores 保持不变，请重跑本步骤。')
        print('=' * 60)
        sys.exit(1)

    # 去重
    deduped = {}
    for fund in all_funds:
        deduped[fund['c']] = fund
    all_funds = list(deduped.values())
    print(f'\n  去重后: {len(all_funds)}只')

    # 2. 初始化靠谱分和风险指标字段
    for fund in all_funds:
        fund['k0w'] = 0
        fund['k1m'] = 0
        fund['k3m'] = 0
        fund['k6m'] = 0
        fund['k1'] = 0
        fund['k2'] = 0
        fund['k3'] = 0
        fund['k5'] = 0
        fund['dd1y'] = None
        fund['dd2y'] = None
        fund['dd3y'] = None
        fund['dd5y'] = None
        fund['sr1y'] = None
        fund['sr2y'] = None
        fund['sr3y'] = None
        fund['sr5y'] = None

    # 3. 计算靠谱指数（v5，仅收益排位）
    print('\n[2] 计算靠谱指数 v5（仅收益排位，无风险指标）...')
    scored = calc_scores_v5(all_funds)
    scored_funds = [r for r in all_funds if r.get('k3', 0) > 0]
    print(f'  有靠谱分的基金: {len(scored_funds)}只')

    # 保存 NDJSON（供后续风险指标步骤使用）
    output_file = os.path.join(SCRIPT_DIR, 'funds_output.ndjson')
    with open(output_file, 'w', encoding='utf-8') as f:
        for fund in all_funds:
            f.write(json.dumps(fund, ensure_ascii=False) + '\n')
    print(f'\n  已保存 NDJSON: {output_file} ({len(all_funds)}条)')

    # 如果是仅输出模式，到此结束
    if args.output_only:
        print('\n[--output-only] 跳过数据库写入')
        print(f'  NDJSON 文件: {output_file}')
        return

    # 4. 清空旧数据并导入
    print('\n[3] 清空 fund_scores 旧数据...')
    try:
        run_mgmt_sql('TRUNCATE TABLE fund_scores')
        print('  已清空')
    except Exception as e:
        print(f'  清空失败: {e}')

    print(f'\n[4] 导入 {len(all_funds)} 条到 Supabase...')
    imported = import_to_supabase(all_funds)

    # 5. 写入 meta
    print('\n[5] 写入 fund_scores_meta...')
    nav_date = all_funds[0].get('date', '') if all_funds else ''
    try:
        run_mgmt_sql('TRUNCATE TABLE fund_scores_meta')
        run_mgmt_sql(f"INSERT INTO fund_scores_meta (update_time, total_count, scored_count, nav_date) VALUES (NOW()::text, {len(all_funds)}, {len(scored_funds)}, '{nav_date}')")
        print(f'  meta: total={len(all_funds)}, scored={len(scored_funds)}, date={nav_date}')
    except Exception as e:
        print(f'  meta写入失败: {e}')

    # 6. 验证
    print('\n[6] 验证...')
    result = run_mgmt_sql("SELECT count(*) as cnt FROM fund_scores")
    print(f'  fund_scores: {result[0]["cnt"]} 条')

    # 各分类统计
    stats = run_mgmt_sql("SELECT t0, count(*) as cnt, count(k3) as scored FROM fund_scores GROUP BY t0 ORDER BY cnt DESC")
    print('\n  分类统计:')
    for s in stats:
        print(f'    {s["t0"]}: {s["cnt"]}只, 有靠谱分{s["scored"]}只')

    # Top 10 靠谱分
    top10 = run_mgmt_sql("SELECT c, n, t0, k1, k3 FROM fund_scores WHERE k3 > 0 ORDER BY k3 DESC LIMIT 10")
    print('\n  Top 10 靠谱分:')
    for t in top10:
        print(f'    {t["c"]} {t["n"]}: k1={t["k1"]}, k3={t["k3"]}')

    print('\nDone!')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='基金数据全量抓取 + Supabase 导入')
    parser.add_argument('--output-only', action='store_true', help='仅输出 NDJSON，不写入 Supabase')
    args = parser.parse_args()
    main()
