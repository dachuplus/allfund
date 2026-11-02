#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成投教站点公司清单 scripts/toujiao_companies.json

口径：管理规模（全部，含货币基金），单位亿元，保留两位。
数据源：东方财富「基金公司一览表」 https://fund.eastmoney.com/company/default.html
  - 该表为「全部管理规模」，但各行快照日期不一（部分偏旧）。为纠偏，取值用
    max(东财全部, 已知非货)，因「全部规模」必然 >= 「非货规模」。
  - Top50 的非货规模种子亦来自资事堂(WIND)。
排序：按上述「全部管理规模」降序；无数据者置末（scale 缺省）。
字段：
  rank / name / domain / edu / verified / scale(亿元,2位; 缺省=无公开数据)
"""
import json, os

# (name, domain, scale_or_None) —— 无序，生成时按 scale 降序并赋 rank
COMPANIES = [
    ('易方达基金', 'efunds.com.cn', 25404.27),
    ('华夏基金', 'chinaamc.com', 18568.71),
    ('广发基金', 'gffunds.com.cn', 16849.59),
    ('南方基金', 'southernfund.com', 15477.55),
    ('富国基金', 'fullgoal.com.cn', 14503.96),
    ('汇添富基金', '99fund.com', 12247.80),
    ('天弘基金', 'thfund.com.cn', 11927.70),
    ('鹏华基金', 'phfund.com.cn', 11514.06),
    ('博时基金', 'bosera.com', 10755.82),
    ('建信基金', 'ccbfund.cn', 10318.39),
    ('嘉实基金', 'harvestfund.com.cn', 10236.38),
    ('景顺长城基金', 'igwfmc.com', 9753.79),
    ('招商基金', 'cmfchina.com', 9725.70),
    ('国泰基金', 'jxfund.com.cn', 9558.52),
    ('工银瑞信基金', 'icbccs.com.cn', 9129.19),
    ('兴证全球基金', 'xqfunds.com', 8395.36),
    ('平安基金', 'pinganfund.com', 7698.42),
    ('华安基金', 'huaan.com.cn', 7529.84),
    ('银华基金', 'yhfund.com.cn', 7158.23),
    ('中欧基金', 'zofund.com', 7070.33),
    ('永赢基金', 'maxwealthfund.com', 6935.41),
    ('中银基金', 'bocim.com', 6617.29),
    ('华泰柏瑞基金', 'huaaipb.com', 6567.74),
    ('万家基金', 'wjasset.com', 6489.72),
    ('交银施罗德基金', 'jysld.com', 5742.60),
    ('兴业基金', 'cib-fund.com.cn', 5338.39),
    ('大成基金', 'dcfund.com.cn', 5051.27),
    ('华宝基金', 'fund001.com', 4169.20),
    ('长城基金', 'ccdfund.com.cn', 3901.68),
    ('国寿安保基金', 'guoshengan.com', 3826.40),
    ('浦银安盛基金', 'pyaxa.com', 3726.05),
    ('海富通基金', 'hftfund.com', 3292.39),
    ('华商基金', 'hsfund.com', 2651.09),
    ('上银基金', 'boscam.com.cn', 2620.07),
    ('鑫元基金', 'xyfunds.com.cn', 2535.09),
    ('农银汇理基金', 'abc-ca.com', 2496.99),
    ('摩根基金', 'jpmorgan.com.cn', 2459.23),
    ('中金基金', 'ciccfund.com', 2429.12),
    ('长信基金', 'cxfund.com.cn', 2182.48),
    ('国投瑞银基金', 'ubssdic.com', 2069.16),
    ('上海东方证券资产', 'dfham.com', 2042.59),
    ('东证资管', 'dfham.com', 2042.59),
    ('中信保诚基金', 'citic-pru.com', 2037.82),
    ('创金合信基金', 'cjhxfund.com', 1988.81),
    ('诺安基金', 'noan.com.cn', 1892.67),
    ('东方基金', 'orient-fund.com', 1840.79),
    ('中加基金', 'fundca.com', 1756.94),
    ('泰康基金', 'tkfunds.com', 1729.21),
    ('国联基金', 'guolian.com.cn', 1658.61),
    ('鹏扬基金', 'pyfund.com.cn', 1614.65),
    ('西部利得基金', 'wlfunds.com.cn', 1562.99),
    ('财通基金', 'cnta.com.cn', 1529.00),
    ('民生加银基金', 'msjud.com', 1486.16),
    ('华富基金', 'hffund.com', 1455.07),
    ('融通基金', 'rufund.com.cn', 1453.73),
    ('信达澳亚基金', 'cinda.com.cn', 1423.96),
    ('申万菱信基金', 'swsmu.com', 1301.04),
    ('长盛基金', 'csfund.com.cn', 1273.74),
    ('国联安基金', 'guolian-an.com', 1271.82),
    ('宏利基金', 'manulife.com.cn', 1247.26),
    ('中银国际证券', 'bocifund.com', 1211.85),
    ('安信基金', 'essenceasset.com', 1205.48),
    ('前海开源基金', 'qhkyfund.com.cn', 1110.80),
    ('财通证券资管', 'cnta-zg.com', 1071.40),
    ('银河基金', 'galaxyasset.com', 1043.34),
    ('国金基金', 'gjfund.com', 1010.11),
    ('光大保德信基金', 'ebscn.com', 1000.76),
    ('中邮基金', 'cmsfunds.com.cn', 895.19),
    ('金鹰基金', 'gefund.com.cn', 887.15),
    ('国海富兰克林基金', 'ftfund.com', 875.42),
    ('宝盈基金', 'baoying.com.cn', 731.85),
    ('招商证券资管', 'cmsamt.com', 667.96),
    ('德邦基金', 'dbfund.com.cn', 667.36),
    ('英大基金', 'ydfund.com', 667.10),
    ('睿远基金', 'reyuanfund.com', 649.00),
    ('西藏东财基金', 'dfcffund.com', 604.45),
    ('汇丰晋信基金', 'hsbcjt.com', 603.92),
    ('新华基金', 'ncfund.com.cn', 538.79),
    ('泰信基金', 'taixin.com', 538.25),
    ('惠升基金', 'hsfund.com.cn', 534.00),
    ('博道基金', 'bdfund.com', 502.09),
    ('蜂巢基金', 'fcfrom.com', 418.00),
    ('诺德基金', 'nuode.com', 344.73),
    ('红土创新基金', 'htcxmc.com', 272.02),
    ('淳厚基金', 'chfund.com', 217.74),
    ('中庚基金', 'zgfunds.com.cn', 98.52),
    ('天治基金', 'tzfund.com', 81.93),
    ('兴证证券资管', 'xzaz.com', 79.16),
    ('中海基金', 'zhfunds.com', 78.12),
    ('朱雀基金', 'zque.com', 64.98),
    ('湘财基金', 'xc-fund.com', 57.25),
    ('恒越基金', 'hyfund.com', 55.75),
    ('同泰基金', 'ttfund.com', 48.51),
    ('兴华基金', 'xinghua.com', 45.93),
    ('尚正基金', 'szfund.com', 34.71),
    ('弘毅远方基金', 'hongyi.com', 17.75),
    ('九泰基金', 'jiutaifunds.com', 8.16),
    ('益民基金', 'ymfund.com', 6.88),
    ('达诚基金', 'dcfund.com.cn', 5.97),
    ('瑞达基金', 'ruida.com', 1.44),
    ('凯石基金', 'ksfund.com', 1.32),
    ('中信证券资管', 'citicfund.com', None),
    ('中融基金', 'zrfunds.com.cn', None),
    ('华融基金', 'hrfund.com', None),
]

# 已确认的投教域名（用户给的 5 个 + 实测可达）
CONFIRMED = {
    "efunds.com.cn": "https://edu.efunds.com.cn/",
    "phfund.com.cn": "https://edu.phfund.com.cn/",
    "thfund.com.cn": "https://edu.thfund.com.cn/",
    "icbccs.com.cn": "https://edu.icbccs.com.cn/",
    "xqfunds.com": "https://edu.xqfunds.com/",
}

# 按规模降序排序（None 置末），赋 rank
ordered = sorted(COMPANIES, key=lambda t: (t[2] is None, -(t[2] or 0)))

out = []
for i, (name, domain, scale) in enumerate(ordered, start=1):
    if domain in CONFIRMED:
        edu = CONFIRMED[domain]; verified = True
    else:
        edu = "https://edu." + domain + "/"; verified = False
    rec = {"rank": i, "name": name, "domain": domain, "edu": edu, "verified": verified}
    if scale is not None:
        rec["scale"] = round(float(scale), 2)
    out.append(rec)

here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, "toujiao_companies.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("wrote", len(out), "companies ->", path)
print("with scale:", sum(1 for c in out if "scale" in c), "/", len(out))
