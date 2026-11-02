#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成投教站点公司清单 scripts/toujiao_companies.json
- 排序依据：2025Q4 公募基金非货管理规模（WIND，资事堂整理）Top50 为权威种子
- 投教域名推导规则：优先用已知确认域名，其余按 edu.{主域名} 模式推导（待爬虫实测可达性）
- 51-100 为名次相邻的知名公募（best-effort，域名待核实）
字段：
  rank        规模名次（1=最大）
  name        公司全称/简称
  domain      公司主站域名（推导用）
  edu         投教基地地址（推导）
  verified    域名是否已由人工/实测确认（默认 false，爬虫实测后回填）
"""
import json, os

# name -> domain (best-effort). 前50名依据 2025Q4 非货规模权威排名。
COMPANIES = [
    # ---- Top 50 (2025Q4 非货规模, WIND) ----
    ("易方达基金", "efunds.com.cn"),
    ("华夏基金", "chinaamc.com"),
    ("广发基金", "gffunds.com.cn"),
    ("富国基金", "fullgoal.com.cn"),
    ("南方基金", "southernfund.com"),
    ("嘉实基金", "harvestfund.com.cn"),
    ("汇添富基金", "99fund.com"),
    ("华泰柏瑞基金", "huaaipb.com"),
    ("博时基金", "bosera.com"),
    ("景顺长城基金", "igwfmc.com"),
    ("招商基金", "cmfchina.com"),
    ("鹏华基金", "phfund.com.cn"),
    ("国泰基金", "jxfund.com.cn"),
    ("华安基金", "huaan.com.cn"),
    ("工银瑞信基金", "icbccs.com.cn"),
    ("永赢基金", "maxwealthfund.com"),
    ("中欧基金", "zofund.com"),
    ("天弘基金", "thfund.com.cn"),
    ("中银基金", "bocim.com"),
    ("兴证全球基金", "xqfunds.com"),
    ("银华基金", "yhfund.com.cn"),
    ("平安基金", "pinganfund.com"),
    ("大成基金", "dcfund.com.cn"),
    ("兴业基金", "cib-fund.com.cn"),
    ("交银施罗德基金", "jysld.com"),
    ("华宝基金", "fund001.com"),
    ("建信基金", "ccbfund.cn"),
    ("海富通基金", "hftfund.com"),
    ("国寿安保基金", "guoshengan.com"),
    ("上海东方证券资产", "dfham.com"),
    ("上银基金", "boscam.com.cn"),
    ("浦银安盛基金", "pyaxa.com"),
    ("万家基金", "wjasset.com"),
    ("国投瑞银基金", "ubssdic.com"),
    ("长城基金", "ccdfund.com.cn"),
    ("华商基金", "hsfund.com"),
    ("鑫元基金", "xyfunds.com.cn"),
    ("农银汇理基金", "abc-ca.com"),
    ("中加基金", "fundca.com"),
    ("摩根基金", "jpmorgan.com.cn"),
    ("民生加银基金", "msjud.com"),
    ("国联基金", "guolian.com.cn"),
    ("中银国际证券", "bocifund.com"),
    ("创金合信基金", "cjhxfund.com"),
    ("鹏扬基金", "pyfund.com.cn"),
    ("东方基金", "orient-fund.com"),
    ("财通证券资管", "cnta-zg.com"),
    ("国联安基金", "guolian-an.com"),
    ("泰康基金", "tkfunds.com"),
    ("中信保诚基金", "citic-pru.com"),
    # ---- 51-100 (相邻梯队, best-effort) ----
    ("中信证券资管", "citicfund.com"),
    ("中金基金", "ciccfund.com"),
    ("诺安基金", "noan.com.cn"),
    ("长信基金", "cxfund.com.cn"),
    ("中庚基金", "zgfunds.com.cn"),
    ("安信基金", "essenceasset.com"),
    ("财通基金", "cnta.com.cn"),
    ("睿远基金", "reyuanfund.com"),
    ("前海开源基金", "qhkyfund.com.cn"),
    ("西部利得基金", "wlfunds.com.cn"),
    ("诺德基金", "nuode.com"),
    ("德邦基金", "dbfund.com.cn"),
    ("红土创新基金", "htcxmc.com"),
    ("中邮基金", "cmsfunds.com.cn"),
    ("宏利基金", "manulife.com.cn"),
    ("光大保德信基金", "ebscn.com"),
    ("宝盈基金", "baoying.com.cn"),
    ("银河基金", "galaxyasset.com"),
    ("申万菱信基金", "swsmu.com"),
    ("融通基金", "rufund.com.cn"),
    ("国海富兰克林基金", "bny mellon? franklin templeton", "ftfund.com"),  # placeholder
    ("中海基金", "zhfunds.com"),
    ("金鹰基金", "gefund.com.cn"),
    ("招商证券资管", "cmsamt.com"),
    ("兴证证券资管", "xzaz.com"),
    ("东证资管", "dfham.com"),
    ("汇丰晋信基金", "hsbcjt.com"),
    ("信达澳亚基金", "cinda.com.cn"),
    ("华富基金", "hffund.com"),
    ("泰信基金", "taixin.com"),
    ("天治基金", "tzfund.com"),
    ("益民基金", "ymfund.com"),
    ("新华基金", "ncfund.com.cn"),
    ("长盛基金", "csfund.com.cn"),
    ("国金基金", "gjfund.com"),
    ("英大基金", "ydfund.com"),
    ("中融基金", "zrfunds.com.cn"),
    ("九泰基金", "jiutaifunds.com"),
    ("弘毅远方基金", "hongyi.com"),
    ("凯石基金", "ksfund.com"),
    ("博道基金", "bdfund.com"),
    ("朱雀基金", "zque.com"),
    ("惠升基金", "hsfund.com.cn"),
    ("同泰基金", "ttfund.com"),
    ("西藏东财基金", "dfcffund.com"),
    ("蜂巢基金", "fcfrom.com"),
    ("淳厚基金", "chfund.com"),
    ("达诚基金", "dacheng? dcfund", "dcfund.com.cn"),  # 可能与大成冲突占位
    ("瑞达基金", "ruida.com"),
    ("尚正基金", "szfund.com"),
    ("兴华基金", "xinghua.com"),
    ("恒越基金", "hyfund.com"),
    ("湘财基金", "xc-fund.com"),
    ("华融基金", "hrfund.com"),
]

# 已确认的投教域名（用户给的 5 个 + 实测可达）
CONFIRMED = {
    "efunds.com.cn": "https://edu.efunds.com.cn/",
    "phfund.com.cn": "https://edu.phfund.com.cn/",
    "thfund.com.cn": "https://edu.thfund.com.cn/",
    "icbccs.com.cn": "https://edu.icbccs.com.cn/",
    "xqfunds.com": "https://edu.xqfunds.com/",
}

out = []
for i, item in enumerate(COMPANIES, start=1):
    if len(item) == 3:
        name, _note, domain = item
    else:
        name, domain = item
    if domain in CONFIRMED:
        edu = CONFIRMED[domain]
        verified = True
    else:
        edu = "https://edu." + domain + "/"
        verified = False
    out.append({
        "rank": i,
        "name": name,
        "domain": domain,
        "edu": edu,
        "verified": verified,
    })

here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, "toujiao_companies.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("wrote", len(out), "companies ->", path)
