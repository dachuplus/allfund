#!/usr/bin/env python3
"""
一次性回刷 fund_scores.fund_scale 到最新季度规模（数据源：天天基金 pingzhongdata 净资产）。

背景：日常流水线 update-scores.yml 不刷新 fund_scale（fetch_fund_basic_info.py 补缺模式
不含 fund_scale 触发字段，且 supplement_fund_details.py 只写 fund_raw_sample 而非
fund_scores），导致规模自首次回填后永久陈旧（如 016644 停在 Q1 145.906，而上游 Q2=83.8512）。

本脚本：
  1. 读取 fund_scores 全部基金代码；
  2. 逐只抓取 http://fund.eastmoney.com/pingzhongdata/{code}.js 的 Data_assetAllocation
     净资产序列末点（亿元，最新季度值）；
  3. 批量 UPDATE fund_scores.fund_scale。

可作为季度定时任务执行（--limit 可限定批次，--resume 基于本地进度文件断点续跑）。

用法：
  python3 backfill_fund_scale.py --limit 5     # 先小批量自测
  python3 backfill_fund_scale.py              # 全量回刷
  python3 backfill_fund_scale.py --resume      # 断点续跑（跳过已成功写入的代码）
"""
import os, re, sys, json, time, threading, argparse
import urllib.request
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

SUPABASE_URL = "https://tqhtegazxykkqfcpejky.supabase.co"
ANON_KEY     = "sb_publishable_iFtMcvav774gqF28gGYQVw_QMmuS-z3"
MGMT_URL     = "https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query"
MGMT_PAT     = os.environ.get("SUPABASE_MGMT_TOKEN") or os.environ.get("SUPABASE_PAT") or ""
MGMT_HEADERS = {"Authorization": f"Bearer {MGMT_PAT}", "Content-Type": "application/json"}
ANON_HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

WORKERS     = 6
RATE_DELAY  = 0.2
FETCH_RETRY = 3
PROGRESS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".backfill_fund_scale.progress")
FAIL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".backfill_fund_scale.failures")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://fund.eastmoney.com/',
    'Accept': '*/*',
}

_rate_lock = threading.Lock()
_rate_last = [0.0]


def rate_sleep():
    with _rate_lock:
        now = time.time()
        wait = RATE_DELAY - (now - _rate_last[0])
        if wait > 0:
            time.sleep(wait)
        _rate_last[0] = time.time()


def extract_json(js, var):
    """从 pingzhongdata JS 提取 var <var> = {...}; 返回解析后的对象或 None。"""
    m = re.search(r'var\s+' + re.escape(var) + r'\s*=\s*(\{.*?\});', js, re.S)
    if not m:
        return None
    raw = m.group(1)
    end_pos = -1
    depth = 0
    in_str = False
    esc = False
    for i, ch in enumerate(raw):
        if esc:
            esc = False
            continue
        if ch == '\\':
            esc = True
            continue
        if ch == "'":
            in_str = not in_str
        elif not in_str:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end_pos = i + 1
                    break
    if end_pos == -1:
        return None
    try:
        return json.loads(raw[:end_pos])
    except Exception:
        return None


def fetch_scale(code: str):
    """抓取单只基金最新净资产规模（亿元）。失败返回 None。"""
    code = str(code).replace('.OF', '').replace('.of', '').strip()
    url = f'http://fund.eastmoney.com/pingzhongdata/{code}.js'
    last_err = None
    for attempt in range(FETCH_RETRY + 1):
        rate_sleep()
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            resp = urllib.request.urlopen(req, timeout=15)
            js = resp.read().decode('utf-8', 'replace')
        except Exception as e:
            last_err = e
            continue
        alloc = extract_json(js, 'Data_assetAllocation')
        if alloc and isinstance(alloc, dict):
            for s in alloc.get('series', []):
                if s.get('name') == '净资产' and s.get('data'):
                    try:
                        return float(s['data'][-1])
                    except Exception:
                        return None
        return None
    if last_err:
        pass  # 抓取失败，返回 None（不写入，保留旧值）
    return None


def get_codes():
    sql = "SELECT c FROM fund_scores ORDER BY c"
    r = requests.post(MGMT_URL, headers=MGMT_HEADERS, timeout=180, json={"query": sql})
    if r.status_code not in (200, 201):
        print(f"  [ERR] 读取代码失败 HTTP {r.status_code}: {r.text[:200]}")
        return []
    try:
        return [row['c'] for row in r.json()]
    except Exception:
        return []


def batch_update(updates):
    """updates: list of {'c': code, 'v': float}。批量 CASE WHEN UPDATE。"""
    if not updates:
        return 0
    when = " ".join(f"WHEN '{u['c']}' THEN {u['v']}" for u in updates)
    ins = ", ".join(f"'{u['c']}'" for u in updates)
    sql = f'UPDATE public.fund_scores SET "fund_scale" = CASE c {when} END WHERE c IN ({ins})'
    try:
        r = requests.post(MGMT_URL, headers=MGMT_HEADERS, timeout=180, json={"query": sql})
        if r.status_code in (200, 201):
            return len(updates)
    except Exception as e:
        print(f"  [ERR] batch update 异常: {e}")
    return 0


def load_progress():
    done = set()
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        done.add(line)
        except Exception:
            pass
    return done


def save_progress(done):
    try:
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            for c in sorted(done):
                f.write(c + '\n')
    except Exception:
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=None, help='仅处理前 N 只（自测用）')
    ap.add_argument('--resume', action='store_true', help='跳过进度文件中已成功写入的代码')
    ap.add_argument('--from-file', type=str, default=None, help='从指定文件读取代码列表（每行列一个 c，用于失败补刷）')
    args = ap.parse_args()

    if not MGMT_PAT:
        sys.exit("缺少 SUPABASE_MGMT_TOKEN / SUPABASE_PAT（环境变量或 .env.local）")

    if args.from_file:
        with open(args.from_file, 'r', encoding='utf-8') as f:
            codes = [line.strip() for line in f if line.strip()]
        print(f"[*] 从文件读取 {len(codes)} 只（失败补刷模式）")
    else:
        codes = get_codes()
    if not codes:
        sys.exit("未获取到基金代码，终止")
    print(f"[*] fund_scores 共 {len(codes)} 只")

    done = load_progress() if args.resume else set()
    if done:
        codes = [c for c in codes if c not in done]
        print(f"[*] resume 模式：剩余 {len(codes)} 只待处理")

    if args.limit:
        codes = codes[:args.limit]
        print(f"[*] --limit 限定处理 {len(codes)} 只")

    BATCH = 200
    results = []
    processed = [0]
    failures = []
    lock = threading.Lock()

    def worker(code):
        v = fetch_scale(code)
        with lock:
            if v is not None:
                results.append({'c': code, 'v': v})
            else:
                failures.append(code)  # 抓取失败（None）→ 记录，便于诊断/补刷
            processed[0] += 1
            if processed[0] % 200 == 0:
                print(f"  [进度] {processed[0]}/{len(codes)}，已取到规模 {len(results)} 只，失败 {len(failures)} 只")
            # 每 200 只写入一次
            if processed[0] % BATCH == 0:
                n = batch_update(results)
                if n:
                    for u in results:
                        done.add(u['c'])
                    save_progress(done)
                    results.clear()
                else:
                    print(f"  [WARN] 批次写入失败（HTTP），本批 {len(results)} 只将在末尾重试")

    # 并发抓取（受全局 rate_sleep 限流，workers 越多网络重叠越高）
    print(f"[*] 启动并发抓取：WORKERS={WORKERS}，RATE_DELAY={RATE_DELAY}s")
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        fut_to_code = {ex.submit(worker, c): c for c in codes}
        for _ in as_completed(fut_to_code):
            pass  # 进度在 worker 内打印

    if results:
        n = batch_update(results)
        if n:
            for u in results:
                done.add(u['c'])
            save_progress(done)
            print(f"  [完成] 末批写入 {n} 只")
        else:
            print(f"  [WARN] 末批写入失败，进度文件未更新；可 --resume 重试")

    # 记录抓取失败的代码，便于后续针对性补刷
    if failures:
        try:
            with open(FAIL_FILE, 'w', encoding='utf-8') as f:
                for c in sorted(failures):
                    f.write(c + '\n')
            print(f"[*] 抓取失败（未更新）代码已记录至 {FAIL_FILE}：共 {len(failures)} 只")
        except Exception:
            pass

    print(f"[*] 回刷完成。成功写入 {len(done)} 只（含历史进度）。")
    if os.path.exists(PROGRESS_FILE):
        try:
            os.remove(PROGRESS_FILE)
            print("[*] 已清理进度文件")
        except Exception:
            pass


if __name__ == "__main__":
    main()
