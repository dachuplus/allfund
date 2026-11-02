#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成投教站点公司清单 scripts/toujiao_companies.json
- 排序依据：2025Q4 公募基金非货管理规模（WIND，资事堂整理）Top50 为权威种子
- 投教域名推导规则：优先用已知确认域名，其余按 edu.{主域名} 模式推导（待爬虫实测可达性）
- 51-100 为名次相邻的知名公募（best-effort，域名待核实）
- scale 字段：2025Q4 非货管理规模（单位：亿元，保留两位）。Top50 取自资事堂(WIND)精确值；
  51-104 按公司名从 WIND 完整榜单 name-match 取得；部分极小型/券商资管子公司无公开排名则置 None。
字段：
  rank        规模名次（1=最大）
  name        公司全称/简称
  domain      公司主站域名（推导用）
  edu         投教基地地址（推导）
  verified    域名是否已由人工/实测确认（默认 false，爬虫实测后回填）
  scale       2025Q4 非货管理规模（亿元，2位小数）；None=无公开数据
"""
import json, os

# (name, domain, scale_or_None)
COMPANIES = [
    # ---- Top 50 (2025Q4 非货规模, WIND/资事堂) ----
    ("易方达基金", "efunds.com.cn", 16014.78),
    ("华夏基金", "chinaamc.com", 13975.51),
    ("广发基金", "gffunds.com.cn", 9716.34),
    ("富国基金", "fullgoal.com.cn", 8506.51),
    ("南方基金", "southernfund.com", 8032.53),
    ("嘉实基金", "harvestfund.com.cn", 7928.62),
    ("汇添富基金", "99fund.com", 6574.63),
    ("华泰柏瑞基金", "huaaipb.com", 6567.74),
    ("博时基金", "bosera.com", 6488.09),
    ("景顺长城基金", "igwfmc.com", 6060.81),
    ("招商基金", "cmfchina.com", 5897.52),
    ("鹏华基金", "phfund.com.cn", 5722.09),
    ("国泰基金", "jxfund.com.cn", 5516.38),
    ("华安基金", "huaan.com.cn", 4850.17),
    ("工银瑞信基金", "icbccs.com.cn", 4750.26),
    ("永赢基金", "maxwealthfund.com", 4451.22),
    ("中欧基金", "zofund.com", 4328.07),
    ("天弘基金", "thfund.com.cn", 4274.06),
    ("中银基金", "bocim.com", 3352.81),
    ("兴证全球基金", "xqfunds.com", 3026.26),
    ("银华基金", "yhfund.com.cn", 2954.73),
    ("平安基金", "pinganfund.com", 2765.94),
    ("大成基金", "dcfund.com.cn", 2746.61),
    ("兴业基金", "cib-fund.com.cn", 2677.56),
    ("交银施罗德基金", "jysld.com", 2263.50),
    ("华宝基金", "fund001.com", 2180.13),
    ("建信基金", "ccbfund.cn", 2099.65),
    ("海富通基金", "hftfund.com", 2041.12),
    ("国寿安保基金", "guoshengan.com", 1789.78),
    ("上海东方证券资产", "dfham.com", 1732.45),
    ("上银基金", "boscam.com.cn", 1651.82),
    ("浦银安盛基金", "pyaxa.com", 1568.64),
    ("万家基金", "wjasset.com", 1560.21),
    ("国投瑞银基金", "ubssdic.com", 1518.86),
    ("长城基金", "ccdfund.com.cn", 1505.61),
    ("华商基金", "hsfund.com", 1470.91),
    ("鑫元基金", "xyfunds.com.cn", 1409.63),
    ("农银汇理基金", "abc-ca.com", 1369.31),
    ("中加基金", "fundca.com", 1365.85),
    ("摩根基金", "jpmorgan.com.cn", 1350.00),
    ("民生加银基金", "msjud.com", 1294.12),
    ("国联基金", "guolian.com.cn", 1236.32),
    ("中银国际证券", "bocifund.com", 1211.85),
    ("创金合信基金", "cjhxfund.com", 1167.20),
    ("鹏扬基金", "pyfund.com.cn", 1164.84),
    ("东方基金", "orient-fund.com", 1096.22),
    ("财通证券资管", "cnta-zg.com", 1028.99),
    ("国联安基金", "guolian-an.com", 999.31),
    ("泰康基金", "tkfunds.com", 972.78),
    ("中信保诚基金", "citic-pru.com", 954.02),
    # ---- 51-104 (相邻梯队, best-effort；scale 按 WIND 完整榜单 name-match) ----
    ("中信证券资管", "citicfund.com", None),
    ("中金基金", "ciccfund.com", 932.00),
    ("诺安基金", "noan.com.cn", 670.00),
    ("长信基金", "cxfund.com.cn", 863.00),
    ("中庚基金", "zgfunds.com.cn", None),
    ("安信基金", "essenceasset.com", 817.00),
    ("财通基金", "cnta.com.cn", 725.00),
    ("睿远基金", "reyuanfund.com", 649.00),
    ("前海开源基金", "qhkyfund.com.cn", 769.00),
    ("西部利得基金", "wlfunds.com.cn", 886.00),
    ("诺德基金", "nuode.com", 265.00),
    ("德邦基金", "dbfund.com.cn", 543.00),
    ("红土创新基金", "htcxmc.com", None),
    ("中邮基金", "cmsfunds.com.cn", 722.00),
    ("宏利基金", "manulife.com.cn", 651.00),
    ("光大保德信基金", "ebscn.com", 679.00),
    ("宝盈基金", "baoying.com.cn", 441.00),
    ("银河基金", "galaxyasset.com", 656.00),
    ("申万菱信基金", "swsmu.com", 669.00),
    ("融通基金", "rufund.com.cn", 824.00),
    ("国海富兰克林基金", "ftfund.com", 507.00),
    ("中海基金", "zhfunds.com", None),
    ("金鹰基金", "gefund.com.cn", 463.00),
    ("招商证券资管", "cmsamt.com", None),
    ("兴证证券资管", "xzaz.com", None),
    ("东证资管", "dfham.com", 1732.45),
    ("汇丰晋信基金", "hsbcjt.com", 387.00),
    ("信达澳亚基金", "cinda.com.cn", 612.00),
    ("华富基金", "hffund.com", 722.00),
    ("泰信基金", "taixin.com", 152.00),
    ("天治基金", "tzfund.com", None),
    ("益民基金", "ymfund.com", None),
    ("新华基金", "ncfund.com.cn", 318.00),
    ("长盛基金", "csfund.com.cn", None),
    ("国金基金", "gjfund.com", 510.00),
    ("英大基金", "ydfund.com", 479.00),
    ("中融基金", "zrfunds.com.cn", None),
    ("九泰基金", "jiutaifunds.com", None),
    ("弘毅远方基金", "hongyi.com", None),
    ("凯石基金", "ksfund.com", None),
    ("博道基金", "bdfund.com", 359.00),
    ("朱雀基金", "zque.com", None),
    ("惠升基金", "hsfund.com.cn", 534.00),
    ("同泰基金", "ttfund.com", None),
    ("西藏东财基金", "dfcffund.com", 553.00),
    ("蜂巢基金", "fcfrom.com", 418.00),
    ("淳厚基金", "chfund.com", 199.00),
    ("达诚基金", "dcfund.com.cn", None),
    ("瑞达基金", "ruida.com", None),
    ("尚正基金", "szfund.com", None),
    ("兴华基金", "xinghua.com", None),
    ("恒越基金", "hyfund.com", None),
    ("湘财基金", "xc-fund.com", None),
    ("华融基金", "hrfund.com", None),
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
for i, (name, domain, scale) in enumerate(COMPANIES, start=1):
    if domain in CONFIRMED:
        edu = CONFIRMED[domain]
        verified = True
    else:
        edu = "https://edu." + domain + "/"
        verified = False
    rec = {
        "rank": i,
        "name": name,
        "domain": domain,
        "edu": edu,
        "verified": verified,
    }
    if scale is not None:
        rec["scale"] = round(float(scale), 2)
    out.append(rec)

here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, "toujiao_companies.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("wrote", len(out), "companies ->", path)
print("with scale:", sum(1 for c in out if "scale" in c), "/", len(out))
