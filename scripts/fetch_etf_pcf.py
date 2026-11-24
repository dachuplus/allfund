#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主动ETF PCF（申购赎回清单）抓取脚本 —— 静态 JSON 方案（不落数据库）

数据源（均为交易所公开接口，实测 2026-11-23 可直抓，无需 Playwright）：
- 上交所(sh, 581xxx)：query.sse.com.cn 的 JSONP 接口
    * 基本信息 sqlId=COMMON_SSE_CP_JJLB_ETFJJGK_GGSGSHQD_JBXX_C
    * 成分股   sqlId=COMMON_SSE_CP_JJLB_ETFJJGK_GGSGSHQD_COMPONENT_C
- 深交所(sz, 1589xx)：www.szse.cn/api/report/ShowReport/data?CATALOGID=sgshqd
    * 先按代码+日期查列表，取 encode-open 的 txt 相对路径
    * 再从 reportdocs.static.szse.cn 下载 GBK 编码 txt 并解析“组合信息内容”表

输出：结构化 JSON，供 CI 生成 pcf-data/YYYY-MM-DD.json（放独立数据仓/分支，
避免 push_files_explicit.py 全量对账误删）。

合规：PCF 是申赎篮子，不等于基金全部真实持仓；前端只能表述为“基于 PCF 的组合观察”，
禁止写成实时持仓/推荐/收益预测。

用法：
  python3 scripts/fetch_etf_pcf.py --date 2026-11-23 --out /tmp/pcf.json
  python3 scripts/fetch_etf_pcf.py --date 2026-11-23 --out /tmp/pcf.json --retry 3
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# 首批18只主动ETF（2026-11-23 上市）。代码经交易所 PCF 有无数据核验。
# 上交所 581 开头 9 只；深交所 1589 开头 9 只（158904 不存在，实为 158905-158909）。
ACTIVE_ETFS = [
    {"code": "581000", "name": "摩根大盘成长主动ETF", "market": "sh"},
    {"code": "581010", "name": "汇添富均衡策略智选主动ETF", "market": "sh"},
    {"code": "581020", "name": "华安均衡慧选主动ETF", "market": "sh"},
    {"code": "581030", "name": "华夏质量甄选主动ETF", "market": "sh"},
    {"code": "581050", "name": "易方达品质均衡主动ETF", "market": "sh"},
    {"code": "581060", "name": "永赢景气均衡主动ETF", "market": "sh"},
    {"code": "581070", "name": "平安红利景气主动ETF", "market": "sh"},
    {"code": "581080", "name": "招商价值智选主动ETF", "market": "sh"},
    {"code": "581090", "name": "华泰柏瑞价值精选主动ETF", "market": "sh"},
    {"code": "158900", "name": "南方均衡配置主动ETF", "market": "sz"},
    {"code": "158901", "name": "富国价值优选量化选股主动ETF", "market": "sz"},
    {"code": "158902", "name": "大成红利智选主动ETF", "market": "sz"},
    {"code": "158903", "name": "鹏华价值臻选主动ETF", "market": "sz"},
    {"code": "158905", "name": "工银瑞信红利主动ETF", "market": "sz"},
    {"code": "158906", "name": "华宝均衡精选主动ETF", "market": "sz"},
    {"code": "158907", "name": "国泰鑫汇均衡收益主动ETF", "market": "sz"},
    {"code": "158908", "name": "天弘均衡量化选股主动ETF", "market": "sz"},
    {"code": "158909", "name": "建信均衡优选主动ETF", "market": "sz"},
]

SSE_QUERY = "https://query.sse.com.cn/commonQuery.do"
SSE_SQL_JB = "COMMON_SSE_CP_JJLB_ETFJJGK_GGSGSHQD_JBXX_C"
SSE_SQL_CFG = "COMMON_SSE_CP_JJLB_ETFJJGK_GGSGSHQD_COMPONENT_C"
SSE_REFERER = "https://www.sse.com.cn/"

SZSE_LIST = "https://www.szse.cn/api/report/ShowReport/data"
SZSE_STATIC = "https://reportdocs.static.szse.cn"
SZSE_REFERER = "https://www.szse.cn/disclosure/fund/currency/index.html"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# 行业穿透：从 stock_scores 拉 code→industry（东财二级行业，158 类）。
# anon key 为 publishable（前端 bundle 已公开），非密钥；CI 可用 env 覆盖。
SUPABASE_URL = os.environ.get("PCF_SUPABASE_URL", "https://tqhtegazxykkqfcpejky.supabase.co")
SUPABASE_ANON = os.environ.get("PCF_SUPABASE_ANON", "sb_publishable_iFtMcvav774gqF28gGYQVw_QMmuS-z3")

# 申赎模式码（上交所 JS creationRedemptionEscape）
SSE_MECHANISM = {
    "0": "现金申赎", "1": "沪市成分证券实物对价",
    "2": "沪市、深市成分证券实物对价", "3": "银行间市场债券实物对价",
}
# 挂牌市场码（上交所 JS marketEscape，节选常见）
MARKET_NAME = {
    "101": "上海证券交易所", "102": "深圳证券交易所", "103": "上海证券交易所科创板",
    "104": "深圳证券交易所创业板", "105": "外汇交易中心", "106": "北京证券交易所",
    "9999": "其他",
}
# 现金替代标志（深交所 txt 为文字；上交所为码）
SUBSTITUTION_FLAG = {"0": "禁止", "1": "允许", "2": "必须", "3": "退补"}


def curl(url, headers=(), timeout=60, binary=False):
    """用 curl 抓取（此沙箱 python urllib SSL 握手不稳定，统一走 curl）。"""
    cmd = ["curl", "-sL", "--max-time", str(timeout), "-A", UA]
    for h in headers:
        cmd += ["-H", h]
    cmd.append(url)
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode != 0:
        raise RuntimeError(f"curl failed({r.returncode}): {r.stderr.decode('utf-8','ignore')[:120]}")
    return r.stdout if binary else r.stdout.decode("utf-8", "ignore")


def strip_jsonp(text):
    m = re.search(r"\w+\((.*)\)\s*$", text, re.S)
    return json.loads(m.group(1)) if m else json.loads(text)


def curl_json(url, headers, retries=3, timeout=60):
    last = None
    for i in range(retries):
        try:
            return strip_jsonp(curl(url, headers=headers, timeout=timeout))
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def load_industry_map(retries=3):
    """从 stock_scores 分页拉 code→industry 映射（裸6位码为键）。
    失败返回空字典，不阻断 PCF 主流程（行业字段留空，前端显示 --）。"""
    mp = {}
    offset, page = 0, 1000
    hdr = [f"apikey: {SUPABASE_ANON}", f"Authorization: Bearer {SUPABASE_ANON}"]
    while True:
        url = (f"{SUPABASE_URL}/rest/v1/stock_scores"
               f"?select=code,industry&order=code&offset={offset}&limit={page}")
        rows = None
        for i in range(retries):
            try:
                raw = curl(url, headers=hdr, timeout=45)
                rows = json.loads(raw)
                break
            except Exception:
                time.sleep(1.5 * (i + 1))
        if rows is None:
            print(f"[WARN] 行业映射 offset={offset} 拉取失败，跳过", file=sys.stderr)
            break
        for r in rows:
            code = (r.get("code") or "").split(".")[0]
            ind = (r.get("industry") or "").strip()
            if code and ind:
                mp[code] = ind
        if len(rows) < page:
            break
        offset += page
        if offset > 30000:  # 防御性上限
            break
    print(f"[INFO] 行业映射加载 {len(mp)} 只股票", file=sys.stderr)
    return mp


def build_industry_summary(funds, ind_map):
    """按行业聚合所有主动ETF成分证券：每个行业被几只ETF持有、涉及几只股票、合计持仓。
    '穿透行业'：把 18 只主动ETF 的申赎篮子打散，按底层证券行业重新归集。"""
    # industry -> { stocks: {code:{name,qty,count,etfs}}, etfs:set, total_qty }
    agg = {}
    for f in funds:
        fcode = f["code"]
        for c in f.get("components", []):
            ind = (c.get("industry") or "").strip() or "未分类"
            node = agg.setdefault(ind, {"stocks": {}, "etfs": set(), "total_qty": 0.0})
            node["etfs"].add(fcode)
            qty = c.get("quantity") or 0
            node["total_qty"] += qty
            s = node["stocks"].setdefault(c["code"], {
                "code": c["code"], "name": c.get("name") or "",
                "qty": 0.0, "etfs": set(),
            })
            s["qty"] += qty
            s["etfs"].add(fcode)
    out = []
    for ind, node in agg.items():
        stocks = []
        for s in node["stocks"].values():
            stocks.append({
                "code": s["code"], "name": s["name"],
                "qty": round(s["qty"], 2),
                "etf_count": len(s["etfs"]),
                "etfs": sorted(s["etfs"]),
            })
        stocks.sort(key=lambda x: (-x["etf_count"], -x["qty"], x["code"]))
        out.append({
            "industry": ind,
            "etf_count": len(node["etfs"]),
            "stock_count": len(stocks),
            "total_qty": round(node["total_qty"], 2),
            "stocks": stocks,
        })
    out.sort(key=lambda x: (-x["stock_count"], -x["etf_count"], x["industry"]))
    return out


def num(s):
    """把 ￥1,234.56 / 1,234 / 0.00元 转 float；空/- 返回 None。"""
    if s is None:
        return None
    s = str(s).strip().replace(",", "").replace("￥", "").replace("元", "").replace("份", "")
    if s in ("", "-", "--", "不设上限"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def norm_date(s):
    s = str(s or "").strip()
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:]}"
    return s


def fetch_sse(code, retries):
    h = [f"Referer: {SSE_REFERER}"]
    jb = curl_json(
        f"{SSE_QUERY}?jsonCallBack=cb&isPagination=false&FUNDID2={code}&sqlId={SSE_SQL_JB}",
        h, retries,
    ).get("result") or []
    cfg = curl_json(
        f"{SSE_QUERY}?jsonCallBack=cb&isPagination=false&FUNDID2={code}&sqlId={SSE_SQL_CFG}",
        h, retries,
    ).get("result") or []
    if not jb:
        raise RuntimeError(f"{code} 上交所基本信息为空")
    r = jb[0]
    declared = num(r.get("RECORD_NUM"))
    if declared is not None and int(declared) != len(cfg):
        raise RuntimeError(f"{code} 成分股数不符: 声明{int(declared)} 实际{len(cfg)}")
    components = [{
        "code": (v.get("INSTRUMENT_ID") or "").strip(),
        "name": (v.get("INSTRUMENT_NAME") or "").strip(),
        "quantity": num(v.get("QUANTITY")),
        "sub_flag": v.get("SUBSTITUTION_FLAG"),
        "sub_flag_text": SUBSTITUTION_FLAG.get(str(v.get("SUBSTITUTION_FLAG")), ""),
        "creation_premium": v.get("CREATION_PREMIUM_RATE"),
        "redemption_discount": v.get("REDEMPTION_DISCOUNT_RATE"),
        "sub_cash": num(v.get("SUBSTITUTION_CASH_AMOUNT")),
        "market": MARKET_NAME.get(str(v.get("UNDERLYION_SECURITY_ID")), str(v.get("UNDERLYION_SECURITY_ID") or "")),
    } for v in cfg]
    return {
        "fund_name": (r.get("FUND_NAME") or "").strip(),
        "manager": (r.get("FUND_COMP_NAME") or "").strip(),
        "nav": num(r.get("NAV")),
        "nav_per_unit": num(r.get("NAVPERCU")),       # 最小申赎单位净值
        "pre_cash": num(r.get("PRE_CASH_COMPONENT")),  # 上一交易日现金差额
        "est_cash": num(r.get("ESTIMATED_CASH_COMPONENT")),  # 预估现金
        "max_cash_ratio": r.get("MAX_CASH_RATIO"),
        "creation_unit": num(r.get("CREATION_REDEMPTION_UNIT")),
        "creation_limit": r.get("CREATION_LIMIT"),
        "redemption_limit": r.get("REDEMPTION_LIMIT"),
        "creation_status": r.get("CREATION_REDEMPTION"),
        "mechanism": SSE_MECHANISM.get(str(r.get("CREATION_REDEMPTION_MECHANISM")), ""),
        "publish_iopv": r.get("PUBLISH_IOPV"),
        "trading_day": norm_date(r.get("TRADING_DAY")),
        "pre_trading_day": norm_date(r.get("PRE_TRADING_DAY")),
        "component_count": len(components),
        "components": components,
        "source": "上交所",
    }


def fetch_szse(code, date_dash, retries):
    date_compact = date_dash.replace("-", "")
    url = (f"{SZSE_LIST}?SHOWTYPE=JSON&CATALOGID=sgshqd&TABKEY=tab1"
           f"&txtJCorDH={code}&txtStart={date_dash}&txtEnd={date_dash}&random=0.{int(time.time())%1000}")
    h = [f"Referer: {SZSE_REFERER}", "X-Requested-With: XMLHttpRequest"]
    data = curl_json(url, h, retries)
    rows = data[0].get("data") or []
    if not rows:
        raise RuntimeError(f"{code} 深交所 {date_dash} 无 PCF 清单")
    html = rows[0].get("jjdm", "")
    m = re.search(r"encode-open=['\"]([^'\"]+)['\"]", html)
    if not m:
        raise RuntimeError(f"{code} 未找到 txt 路径: {html[:160]}")
    path = m.group(1)
    raw = curl(f"{SZSE_STATIC}{path}", headers=[f"Referer: https://www.szse.cn/"],
               timeout=60, binary=True)
    text = raw.decode("gbk", "ignore").replace("\r", "")
    raw_lines = [ln.decode("gbk", "ignore").replace("\r", "")
                 for ln in raw.split(b"\n")]  # 成分股表按 GBK 字节定宽解析

    info = {}
    for line in text.split("\n"):
        if "：" not in line:
            continue
        k, v = line.split("：", 1)
        info[k.strip()] = v.strip()

    def g(*keys):
        # 精确匹配优先，再退化为包含匹配（避免“最小申购、赎回单位”误命中“...资产净值”）
        for k in keys:
            if k in info:
                return info[k]
        for k in keys:
            for kk, vv in info.items():
                if k in kk:
                    return vv
        return ""

    # 成分股表：深交所 txt 为 GBK 定宽格式。按 GBK 字节区间切片（空列不会错位）。
    # 实测字节列位：代码[1:8] 名称[38:78] 数量[78:90] 标志[90:106]
    #   申购保证金率[106:131] 赎回保证金率[131:156] 申购替代金额[156:173]
    #   赎回替代金额[173:189] 挂牌市场[189:199] 映射代码[199:209] 实物对价[209:]
    COLS = [(1, 8), (38, 78), (78, 90), (90, 106), (106, 131),
            (131, 156), (156, 173), (173, 189), (189, 199), (199, 209), (209, 280)]
    components = []
    in_table = False
    for raw_ln in raw_lines:
        b = raw_ln.encode("gbk", "ignore")
        line = b.decode("gbk", "ignore")
        if "证券代码" in line and "证券简称" in line:
            in_table = True
            continue
        if not in_table or not line.strip():
            continue
        if not re.match(r"^\s*\d{6}\s", line):
            continue
        def cell(i):
            a, bb = COLS[i]
            return b[a:bb].decode("gbk", "ignore").strip()
        code_c = cell(0)
        if not re.fullmatch(r"\d{6}", code_c):
            continue
        components.append({
            "code": code_c,
            "name": cell(1),
            "quantity": num(cell(2)),
            "sub_flag": cell(3),
            "sub_flag_text": cell(3),
            "creation_premium": cell(4),
            "redemption_discount": cell(5),
            "sub_cash": num(cell(6)),   # 申购替代金额
            "market": cell(8) or "深圳市场",
        })
    if not components:
        raise RuntimeError(f"{code} 深交所 PCF 成分股表解析为空")

    declared_s = g("全部申购赎回组合证券只数")
    declared = num(declared_s.split("只")[0]) if declared_s else None
    # 深交所 txt 的“全部”含跨市场合并证券，与本市场表行数可能不同，仅记录不硬校验。
    return {
        "fund_name": g("基金名称"),
        "manager": g("基金管理公司名称"),
        "nav": num(g("基金份额净值")),
        "nav_per_unit": num(g("最小申购、赎回单位资产净值")),
        "pre_cash": num(g("现金差额")),
        "est_cash": num(g("预估现金差额")),
        "max_cash_ratio": g("可以现金替代比例上限"),
        "creation_unit": num(g("最小申购、赎回单位")),
        "creation_limit": g("当天累计可申购的基金份额上限"),
        "redemption_limit": g("当天累计可赎回的基金份额上限"),
        "creation_status": ("允许" if "允许" in g("是否开放申购", "开放申购") else g("是否开放申购")),
        "mechanism": "深市实物/现金组合",
        "publish_iopv": g("是否需要公布IOPV"),
        "trading_day": date_dash,
        "pre_trading_day": "",
        "component_count": len(components),
        "declared_component_count": int(declared) if declared else None,
        "components": components,
        "source": "深交所",
        "pcf_file": path,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="交易日 YYYY-MM-DD")
    ap.add_argument("--out", required=True, help="输出 JSON 路径")
    ap.add_argument("--retry", type=int, default=3)
    ap.add_argument("--only", default="", help="只抓指定代码(逗号分隔)，调试用")
    ap.add_argument("--workers", type=int, default=8, help="并发数(默认8)")
    args = ap.parse_args()

    only = set(args.only.split(",")) if args.only else None
    targets = [e for e in ACTIVE_ETFS if not only or e["code"] in only]

    def fetch_one(etf):
        if etf["market"] == "sh":
            d = fetch_sse(etf["code"], args.retry)
        else:
            d = fetch_szse(etf["code"], args.date, args.retry)
        return {"code": etf["code"], "short_name": etf["name"],
                "market": etf["market"], **d}

    funds, errors = [], []
    # 并发抓取（每只 curl 2~3 次，串行会累积超时；8 并发总耗时≈单只）
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(fetch_one, e): e for e in targets}
        for fut in as_completed(futs):
            etf = futs[fut]
            try:
                item = fut.result()
                funds.append(item)
                print(f"[OK] {etf['code']} {item['fund_name']} 成分{item['component_count']}", file=sys.stderr)
            except Exception as e:
                errors.append({"code": etf["code"], "error": str(e)})
                print(f"[FAIL] {etf['code']} {e}", file=sys.stderr)
    funds.sort(key=lambda x: x["code"])

    # 行业穿透：注入行业字段 + 生成行业汇总
    ind_map = load_industry_map()
    ind_hit = 0
    ind_total = 0
    for f in funds:
        for c in f.get("components", []):
            ind_total += 1
            ind = ind_map.get(c["code"])
            c["industry"] = ind or ""
            if ind:
                ind_hit += 1
    industry_summary = build_industry_summary(funds, ind_map)
    print(f"[INFO] 行业命中 {ind_hit}/{ind_total}，行业汇总 {len(industry_summary)} 类", file=sys.stderr)

    payload = {
        "date": args.date,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "disclaimer": "PCF(申购赎回清单)是申赎篮子，不等同于基金全部真实持仓；本页仅作基于PCF的组合观察，不构成投资建议。",
        "count": len(funds),
        "funds": funds,
        "industry_summary": industry_summary,
        "industry_coverage": {"hit": ind_hit, "total": ind_total},
        "errors": errors,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"\n输出 {args.out}: 成功{len(funds)} 失败{len(errors)}", file=sys.stderr)
    # 全失败视为任务失败，避免 CI 写入空数据
    if not funds:
        sys.exit(2)


if __name__ == "__main__":
    main()
