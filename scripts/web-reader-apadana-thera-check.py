#!/usr/bin/env python3
"""Actual MCP/browser checks for the ten reviewed Therā publisher two-chapter Apadāna additions; pinned local bytes only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import traceback
from tempfile import TemporaryDirectory
import time
import urllib.request

from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_APADANA_THERA_ā😀'
PRIVATE_MARKER = 'PRIVATE_APADANA_THERA'
MAPPING = {'tha-ap13': 11,
 'tha-ap14': 12,
 'tha-ap15': 13,
 'tha-ap16': 14,
 'tha-ap17': 15,
 'tha-ap18': 16,
 'tha-ap19': 17,
 'tha-ap20': 18,
 'tha-ap21': 19,
 'tha-ap22': 20,
 'tha-ap23': 21,
 'tha-ap24': 22,
 'tha-ap25': 23,
 'tha-ap26': 24,
 'tha-ap27': 25,
 'tha-ap28': 26,
 'tha-ap29': 27,
 'tha-ap30': 28,
 'tha-ap31': 29,
 'tha-ap32': 30}
NEW_IDS = tuple(MAPPING)
BASELINE = {'thi-ap1': '638d3e4b302e259cb18c2f2164373c0ddaa0073fb07a1d2a5457607ef287b7b2',
 'thi-ap2': '1bed49287d4dc1089c273475fdd7ed1c714d10d6f9bf844a07b27897724c944b',
 'thi-ap3': 'e7fe6e215b9f123c001a93b2e488f2c2a8f2022699f6169029a0a3effc907ce7',
 'thi-ap4': 'fd2d3dc5d57ca79e2688888c0b6da08eca02d117aefabb41532a0906e2957fd1',
 'thi-ap5': 'e6cb125378a546911b8348edfb5e30da13c24129a97e83cefeb7811ced63f9ad',
 'thi-ap6': '7748af5daa3e4d149fc8f9ea8d0d1be6dc0f0f5e93b90577aab9a42c7786a2b8',
 'thi-ap7': '58cdffbb119abd6b8c1226ddfe08d0487514d13a1ad332cd894f06ef539c400d',
 'thi-ap8': '2074f7d98be420ab240540c03cd1303c883f2eea4658cdc450b1dd0fe6361c5b',
 'thi-ap9': 'e92139ffd441fc1ec7f22478cb1967e26e86f4c7809f5e011f13e5603a3e5d40',
 'thi-ap10': '58d616df848ae1261f8c1a96ae8e46f57e41c1dfb1e58e115c8faa35d311ebcb',
 'thi-ap11': '45f80b7d98e806ebd897f6576c3c37e3c33e14fc093bac689cc9323691e397d6',
 'thi-ap12': 'b65398f2ae7e1cc166b2815648f3e24762fb86d4ed9146cfeb4bb5c801312550',
 'thi-ap13': 'fc9337b6b1c8756e9bb2c0ec16194e706533a2f318f627c92108f56323438229',
 'thi-ap14': '6db417c2de52f9ec1143423d31955a6b9a68991cb9d19d2715d61b8f4d936bb9',
 'thi-ap15': '4683ae5fd554016b027ab40f72dfaeecc94f5db5b68326b50e22d7e39046f7fe',
 'thi-ap16': '714271b116db84905a18dc6b4aebf09aaab704e4066ae0a71cf6f1bcbc7f4c3d',
 'thi-ap17': 'f5f2668baf155c765ec7810daf97642e26ef4b8bc3dbc71507e80717a7f7571e',
 'thi-ap18': '742ca65fec8a7112de4e178fb5514d73a4ffc5a4eb1b5bbc06c5b61b43e4e099',
 'thi-ap19': 'f476dd4a51d5f58ba6b879a5af25737e1795835f45c18bb09f86e16c586f4b6e',
 'thi-ap20': '1adde5319c3a01c9a054e286e4b2afb1ef63ee139e8e8c22e3f4ec2a37697d2b',
 'thi-ap21': 'aa2676991bedbafa0a5e6ad9c5b4a9915865343c05484e1ec8b59fc26ae9f5b0',
 'thi-ap22': 'c0432d3746156e1de7a526320609881763316a726006d65a2301e51d2430c1fc',
 'thi-ap23': '81b4e8b2e7625540763f1223b914c6d876a81e6a5490364474fd453e2312b642',
 'thi-ap24': '7acf471d37696034d31dd4c4aa7ce6db9fec2d82b1d114469ad12822c1b41c3e',
 'thi-ap25': 'e8987800afe253f202ac44b354971de86662688f35fe5d6e664d284523e342d1',
 'thi-ap26': 'b73d447d93819a593e14cb73a4aadb703d63a79f1b8f4359ce7637257bc4d914',
 'thi-ap27': '2d68901808d79aeb71bb91f34165f40f90cb23934e7b56311e5bc35efc82b19b',
 'thi-ap28': '86b788b41d5e66e71e1594f069a4c029d1111d227c536bdfbbaa51167d863c3d',
 'thi-ap29': '2b02eb40c5beef714304ec27510265428f521c57c3dd2eed9f884e1411fb1eb1',
 'thi-ap30': '42762d786134277d92963151c49369100d8efbf5639361f63e653407439e8719',
 'thi-ap31': '5bdb4f4c84f6370ba5d74dd6bfa99060418171a14e4a967f5232d7204accdd60',
 'thi-ap32': '98e97086c453b45d7a6bddd848bfbac12f094ff201563282b293b64043013739',
 'thi-ap33': 'c910bf52a8471a0e3d38c015d0b1e637a3e8049b86cd8dd69bee69d4bcec190c',
 'thi-ap34': '71bbf89558e0de172df8c08a4763ef2ecb07465a93a4aba14022837f2ef9c767',
 'thi-ap35': '51c9470f92d3a5e85dfbd5700caa30d2233f39c79632af0f4c666de0a61ac66a',
 'thi-ap36': 'b5afa287b8d2fce31645c5129e0c8f944f8ceaf772fe52e90475c82fc0d8f23b',
 'thi-ap37': '10068938f8eec67994e673871fff3ac63d19f466f4367f6a42111b3dda4ef344',
 'thi-ap38': '2d2587aa8cdb386310af232a7df6c7f4e49c5caf6a44de3b7a9b95b03ab6c47a',
 'thi-ap39': 'adc359b500fc1824861c34cfbdfa85f81eb1db7da44e277ce996838a51dc0fde',
 'thi-ap40': '4fa75689160b1e45984c0da9a6f97bf81116c199407b7de89b1aab063de97547'}
BASELINE_PROFILES = {'thi-ap1': '56626007b36eaf34c31ff4553bb06315b9b03a400cb41a0cc0ced2ab4d997e84',
 'thi-ap2': '954bd06c6efd1765b34490631d9aacdc46135da2d94b61d8ffe283c37b68410a',
 'thi-ap3': 'd44d8f0fa5fca6c67aa3baf9219f8adc1b5cc39771b1e4dc640f19e7281679e4',
 'thi-ap4': '2287e562bf1df9e4409b10cfe6bd0ade160f021ccaf827ea8320ff1ca50b332f',
 'thi-ap5': '2742608a1a7aacdba715f0fb2774d22d85135c62113ead7aad1fbc1e6ff09798',
 'thi-ap6': 'a926bfa015b68467e6756ef6f2684421242e8b4ddc22102a5644a225ee3fe612',
 'thi-ap7': '412e5062284431622ff356a2ab867ed5eea6da50bcf62397f7d4221555dc5b39',
 'thi-ap8': '46df61a9044707e079cdf3302499d01e0312c2590460da0e4f770056eaeb004a',
 'thi-ap9': '8f48d69ca212118a08ec2a1754703f33c17bf20421adbf34257c58a1636d4004',
 'thi-ap10': '5ec9b886b77a905449862779c8d9dd2be4ca5c9331261a5fa27b67451c04d1e9',
 'thi-ap11': '5d64d736c3dea23eb6c61992f61fb38cc4863e7da8b1b4f23f85a5d344b2f917',
 'thi-ap12': 'bec1e18af88c95ad3e1dff6dc8a07a583fddc2b2e696b149bb22bdc6983e1e23',
 'thi-ap13': '532b547fb1f3d0f230504ed53ab908500b95f73d50149c80697176f9d46f726d',
 'thi-ap14': 'c55e6c3cc6704c712943700ce50aa77466b8be23236f8552e490038ff8acd89e',
 'thi-ap15': 'd75b2650c8481d7a57fe69613b10453df14bdfaf14d41366bc3cc99ad60a53b4',
 'thi-ap16': '5b199e61e2f929d80a6234ff9fc1f9406554566a4a7108d20baf62bafdee0a9c',
 'thi-ap17': '5b4127350c6bcbe31d4413723167bca4ba7838d5df4868cf6e709097e71c9c0e',
 'thi-ap18': '37fc2520b30eea8c443efe800f36a42337240f7d398faece63b33398d022127b',
 'thi-ap19': '0d061b2c579d07148174d5004cbb8c906549f28d0f2f2f1c94ac062ffba35b73',
 'thi-ap20': '0653c6df7e75bfcee69fb7d0f6f9234020c24476bb636384b6a063c3554685c1',
 'thi-ap21': '605ced76747caebcf59e4423ecefe370c81959726dbbe830b75741c9abe04b51',
 'thi-ap22': 'ed404927392ffbee9c5109e8e4e88418ae8870eaaa1e336d3851f393e1eca344',
 'thi-ap23': '6a7acb881b2d30d15bb97e14e5f0d907cd71700ac9212d8679c28c105321eb4a',
 'thi-ap24': '4f964d5372f22603b933ecf797b701b9416928fa37b046c810633f24be706de5',
 'thi-ap25': '3db71a09bc81e0215e741bf6c0eb00592e69d91f043166316e4dbc9e36e98626',
 'thi-ap26': '3e6ec319c1ffeae17b66d2b10a7e3108b0c5de63ba3189c19bb1b634e5ce34c0',
 'thi-ap27': 'f10a55eb5429ddfe41898a611afd6620d1f1b8b51461a740ca53218eabb06a49',
 'thi-ap28': 'ee189fc40c2c60988630dc62475ce79bd2c91a3bca749657eca2f523d4d62e8a',
 'thi-ap29': '0bfb1ce4f07994897950adf909a8827eb9802621c541a861eb19222df25850f2',
 'thi-ap30': '2493b9006ee353490e56c2b5072d03e8af170f0aac73e5af93f54f0cd5b503e5',
 'thi-ap31': '6294931db448d61eacd7defebffde05806cdd1110376249d98b4f76ee4029943',
 'thi-ap32': '390bb769779172e40578bbc082e148497e648a14f3daa9eef4d6f6bc00a0ba17',
 'thi-ap33': '88900fa89ebce7d99df5c1b26e28d496a9e310ef02d5cf12e1faf20a805b46f9',
 'thi-ap34': '60f4e4a2b5c5e355ed314a436187e3897011d0f0dc9ecf5fe5ef223779cde09f',
 'thi-ap35': '146cc41da26076fec8588f2c8cd0f9c9adfee1701c113fb02b7942338763b1b7',
 'thi-ap36': '632b25842c8d8c3db811bc0f457d156f58534006a0d64d926a6ac39405c3825f',
 'thi-ap37': 'b1dba91af069e523ca70a5ef0d7f91a7ab682c5cf63db3de084cfbcc5b0aaf40',
 'thi-ap38': '905b9b1c7b83a1d80dab5c62c78f9a835474dcc9650da944f47557b39e1257e0',
 'thi-ap39': '5364c837bf4cb0f20ac35114d195f121d841754e71a31324c977dcc7c62aeb1d',
 'thi-ap40': '8da1e22584378b89065a8ef2896f1500f95ebdd4084b5b4abeef1b36099e316a'}
BASELINE_ROOT_SEGMENTS = {'thi-ap1': 'ecfa6ad169c2a694268fc24f999ecf311c9162a85de38b9743f0e3e19474f0ad',
 'thi-ap2': 'dfe95baf5d3dd078d607caa0db434ac93713621f880356c4be8e3cfa43c5dfad',
 'thi-ap3': 'f4ef96914344d6577845628bb24e0a47b189a506ab457fcc53424c9992b64081',
 'thi-ap4': 'c74005b5eff5d1a3c4484b738655d40588f4e3f9a726e0e2098e57635dd609f6',
 'thi-ap5': 'aa5de57e281744761b4cd1d8e8c71ae94c4327f12a32fcfbf789acf5e4e91c29',
 'thi-ap6': '3bdf51135e43d57678d0cb0361ad811d668ef8b43f936e82573fecc76e1a8c8b',
 'thi-ap7': 'fe681a0a0361c6f6d187715708039a9543cdfa1c7617957708881794fb06f935',
 'thi-ap8': '571b29fc1bbd531188206a33cede6c466fc38b46d6adf8d87d4be115ff23fbf7',
 'thi-ap9': '0231d2fbffa9381bb8322493bb78f1c81de9d926796fbbcbc2fa08f34d2062c6',
 'thi-ap10': 'd07d179b7a1d3a735e5b2604ce680a20098c44e22261a57380520b09bb7b88fb',
 'thi-ap11': 'f3abb6975b101fbfdc2c2e04d5ec1ed3c207b02601c725aa7a767ab9c46a152a',
 'thi-ap12': '1dc767478d7cc282952c19b0138f75916e46e7a025286d2906a73f80c7a7469d',
 'thi-ap13': '72d0432fda71f167e31d522412b141fe531c10fbc0434d8a3824aa4f8db37f0b',
 'thi-ap14': 'e841cb18433745b720316269cbb5a5135c85e75af451f0b27ba6c0f2f96d6848',
 'thi-ap15': '6bade028460f8cd84256693587087a14f859e41ded02a959f3e7e121dcd53206',
 'thi-ap16': '26101a9f5560d2014a5669096769a5ca63ca37e27e0bbc2e48686163497a5952',
 'thi-ap17': 'aee3e29db1b47595fc1159722d557d6261a6c7fbff92b3e593a4bb99df005657',
 'thi-ap18': '7edd4658f9896a3e4428569c8cbfc0f56ddedbefbeef121ef28f835b2e07611b',
 'thi-ap19': '9aa464f00c809c3a61a25780af312ed814583d85b61f980b6a642605926be9fc',
 'thi-ap20': '21eb44e1b6c4defe3acc0a598f247c37abb381958470d0d7ac09438762649fbd',
 'thi-ap21': '13d641efb8f725ad78b35bc6f46bedd6911d7007b373d76cc95e357e50a71f17',
 'thi-ap22': '736cf7e2a6ab894210822d7ae7729af0946d79ebf3c4ad4c16f229e35b37bf61',
 'thi-ap23': '863686d92ba7e27b31fbbc8e69eefbbb11ab6973058ee05d5b27a3a20117cc46',
 'thi-ap24': 'e07dfeeef40961c6cd81e78108e2c81b890527822b874e07a586e9960cf347be',
 'thi-ap25': '8c762d22dcfc4c3a51019d55ae0de97db39ab8bb4881cb65e8530bd3f444b075',
 'thi-ap26': '9b6ec4eb112dd50d42c90a4312d59198476ba4fb779e7df45459b5b64090279e',
 'thi-ap27': '780f2eee7a16e10f1d1a153595a605437590fde77d68b3c996d2169c2e5f1496',
 'thi-ap28': '233cc20fb5bccbeeb699cef06c48ceecbb3d3bda0c3d7e29f53bf94471add259',
 'thi-ap29': '31acd9b8881e4d93b47eb59ce2f74977f03de530eb773832131684121b54caf4',
 'thi-ap30': 'b3d585f4bc2b073d676d5058ff7e024d429e19a4d3ea25b5c65e6bd7e3830ca0',
 'thi-ap31': 'd67cc2fdcfbf346dce38fc2261264864c2a261635ceda8c08bc8080e62aaf5a6',
 'thi-ap32': '79d7752cfc1179819bba7f4434dd3d239d123f8b40dca4ebc96671d4f499f8a3',
 'thi-ap33': '8457084f1dbcdf5496d9a456ac443460be261e130623bb7f7d8ea6375bc4edd0',
 'thi-ap34': '5f7ba8d9aba99cce803beb79ce5fb66ddcaf116a55dfff41652a727d1369f5d0',
 'thi-ap35': '92fd3354d10340f6b6b6d6f51fb91bb82b3fa1eb0742b697121d4135d9ada163',
 'thi-ap36': '7ccdb0a7e896cb8de15b9e63a851c040baf730d93b8da3d44ada27298949be62',
 'thi-ap37': '78d2c3c14ef29f1c8fb5089d228ee4242f7acf1dfe5c4e3f80821738ca221b54',
 'thi-ap38': 'dc33f09b78408e7358828fc49eb70a61622582718e4f738e418863bd63d02df4',
 'thi-ap39': '8df4f8aad04443b73eee902f351ba5765a327d3653cb3d81a43a742f1d4c3787',
 'thi-ap40': '11b0e1cdd6cf1e7a2a6ce18685ae10e379eb3a5c14f1bc12ecff4d375afa8cb7'}
LEGACY_LAST = {'tha-ap19': 18, 'tha-ap20': 16, 'tha-ap23': 59, 'tha-ap24': 55}
COMMENTARY_REVISION = '2d134ff9ef60f70a1eb03c9370580228811a3070-tha19-c-958128ac779edd92f7ab7ff8'
SOURCE_REVISION = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
RIGHTS = {'LICENSE.md': '66eea18fe8cb99e0d178d838a4932be0d3af8a6f844e933a8bbb0054e22f2592',
 'src/_pages/about.md': '17d8029419cd7b4c7f9e7f88d0127141d2425b3fe30516888b389ce7521f1352',
 'src/_includes/site/footer.njk': '08a7d4a0c3a9841afa38a8d98aa563e0ddedc6228f66e86b9a49d564aba26fd4',
 'src/_includes/layouts/epub-metadata.xml': '1a6320b1580b76112c63bd557e419d5816b410197da666444e9d412327430b2f',
 'src/_data/site.json': '6b4b5b5661b1bfb35cee0f207066fd6941aa042d6377993b02c77db677319efa',
 'src/_poems/_poems.json': '7c0d9a568ff9c495c89fb3ae13397ff71e8e1d678c221cca5966c9adc886cf22'}
PINS = ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256')
LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
# Independently reviewed exact source identities and pins; no translated wording or notes.
EXPECTED = {'tha-ap13': {'raw_sha256': 'd33ed72ea93a51045d519d525b88f216487c09a6f93ebd4030878f3c30e17887',
              'body_sha256': '9d1a15d12a0719ff67aad4426b41c4140d77e4131a6c03abd3449f4b209f2d90',
              'notes_sha256': '5950d1521db00b6b800eb829efe8880a96355380d8ad6b3e5dc0db58c0a06d0a',
              'paratext_sha256': 'd479cc76e4add36c870892df54f53735fd066eb738fe9f26d5efc6c42f07932c',
              'root_sha256': 'b76bd4bafecc124b242419039fe2a3987ee175ef0d32925c264eb562dade454b',
              'notes': [1, 2, 3, 4, 5, 6, 7],
              'layout': [{'local_label': '1', 'publisher_label': '674', 'suffix': '(1) [674]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '675', 'suffix': '(2) [675]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '676', 'suffix': '(3) [676]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '677', 'suffix': '(4) [677]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '678', 'suffix': '(5) [678]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '679', 'suffix': '(6) [679]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '680', 'suffix': '(7) [680]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '681', 'suffix': '(8) [681]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '682', 'suffix': '(9) [682]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '683', 'suffix': '(10) [683]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '684', 'suffix': '(11) [684]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '685', 'suffix': '(12) [685]', 'lines': 4}],
              'paragraph_hashes': ['ae48ef74f6d94247c424671ff7c089d80a5c8f6abf1bb7816aa5a4e1c77c0846',
                                   'ed4d6c87afc2612665058254eef43eab89aad0a4983b822ccfff380ee72b84ab',
                                   '4bc39a308d5efb7c2974f37ab25e3cb7174b72b65b0c2bf022cfe216f8adffea',
                                   '4829785914aa4b58404b81a1f602e5997c94954002b478234833704d61e1d579',
                                   '4aaa5dd0c60a65ad314d19c100def94f3307bd13a29296e8092127c109637813',
                                   'fdc1ba0693e27512fc3909436e29fcaa5659226b91af7fd99b9362a688433df9',
                                   '6624822452ff7ee52eab4896897e06d58dc40b086f34796d1dca7dc5db9abf2f',
                                   'c9d93333cfb59747adc438b08c15e16fcdd7ccdf9a4dea03a9ae9f7bf95a6d59',
                                   'd138445680a4185b8b75f1ed7581a16fa8883e571055301f24bae01ef8990e8b',
                                   'ab353ed8421d1f6f62fab7c1f3e33795c91d3336e3a597448c7ead6cb92ab2fb',
                                   '18d260fc958890db74f0563963c4e8ef264052b1ae1a5a0de5978f60fc20e006',
                                   'b4379887830da06d9d8eb56664cd29d46ed3ceb61a77798eeb2851fd432c9503',
                                   'e6b4ecb314bad415f1cb57d91ff667907fd092f72fc25a67358590b4e7f3f28f',
                                   '7d26484fcb912055bda7ceb541e3b7b61a8b22f710ccc79f809974c92b2ac7ad',
                                   '20be86b248ac054b4bcc541c79f3b5bd34100190d1c16ddb7fb159e4b9c45bd5']},
 'tha-ap14': {'raw_sha256': 'dbe4c375a728de9e8e753f318f47cf9dafeaf401be8eb3fbe3df5f2300a96967',
              'body_sha256': '8812791b6805818141df108c2e23f558180bf58df2cc0081acd8ca52b6e69350',
              'notes_sha256': '277fb6d0574e883dc468d43f0b7a1b0b3bdd131f62cc0926db4e186c273601fe',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '77a4d9880dd219f15b5b32312dacb756b2b06344313c7a946beaf3d1ea928682',
              'notes': [1, 2, 3, 4, 5, 6],
              'layout': [{'local_label': '1', 'publisher_label': '686', 'suffix': '(1) [686]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '687', 'suffix': '(2) [687]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '688', 'suffix': '(3) [688]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '689', 'suffix': '(4) [689]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '690', 'suffix': '(5) [690]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '691', 'suffix': '(6) [691]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '692', 'suffix': '(7) [692]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '693', 'suffix': '(8) [693]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '694', 'suffix': '(9) [694]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '695', 'suffix': '(10) [695]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '696', 'suffix': '(11) [696]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '697', 'suffix': '(12) [697]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '698', 'suffix': '(13) [698]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '699', 'suffix': '(14) [699]', 'lines': 4}],
              'paragraph_hashes': ['a0b4701b5593885391a8c549fd2fe510a7f521c3876fd9cc7233589bb36142c6',
                                   '646c3ed2385489d7be9ff8b6e616c2a5dd713129d45428034953a4ba92abc470',
                                   'dcec4720df19db5aec527f882e1affa1e4e1db1934e0cb05824778b32fd2f071',
                                   '8c502413bcfab9c006142306a2496693ceab615545756c09fd289aab7630b88b',
                                   'c615d983da52bc62bd0c98a4a53804693e4a64ddea0440f45583f7faaee68fdc',
                                   'ead7668effa8d83ab0e9afadb7718193db8ab01841ccf09788622ecf99b3c17b',
                                   '0be29363c8f4be2394aadf77c9473f50ca2da892680c0a4bc14fdd08ab728bd8',
                                   '6de2cea97c51757315ef925c11df096a0ae3f460d800a2dba75d3e3bc140d4dc',
                                   'c1f490a691e183ad08c4671c246a3d882e566abbcf877f3c15db4c33e3c0f3cf',
                                   '09e2b30120ef4ce0928fd05f0087015c545af0fe8d74e40d78ce60922221f272',
                                   'ff52196a3240bbfb8f13aa3e0a412ddf9388368498ae419ef4ccbc21dd5ccb79',
                                   '56b92c9ba92a4189b30ba05289e479545f85b52c8ab50a7232d97eaee898db4d',
                                   '78b010683f3872ef34474f5452a0e9fa5d6ebd979de1738c9c0e61587e9b817e',
                                   '7463406ac5af7ac4db23e309c42dcb363a03b7b3913aeb51d8aa2500d4a17814',
                                   '344f6725904a28dc884ad0581020c176066ddbf19e82a6dfe1305685a223e118',
                                   '21cb967ff614884e19fa3f0f692389abc2e1b8b92ef54d53e583a0b51f7f1c05',
                                   'cb75ae1ea6a2a2ef05c61425fe158b22f62478b894646295a01a22bea7b32c0a']},
 'tha-ap15': {'raw_sha256': '43d07be6e20b0f7672be272a933fcda0dd590f1919fe06bf75e89baf422f0d7b',
              'body_sha256': 'f8ad2b618089591c4641c87619665bd6adb46d0b9fae964f5a7829fef80e72e5',
              'notes_sha256': '95e6ac528caa6d5494f9fdff56fdf2064e69d781bbcd25d50d8d6b3e49443d4a',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '60e6c4bfd9469a5f85eb672695d1b98c08bb785e36c12704ffd38e020b871d18',
              'notes': [1, 2, 3, 4, 5, 6],
              'layout': [{'local_label': '1', 'publisher_label': '700', 'suffix': '(1) [700]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '701', 'suffix': '(2) [701]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '702', 'suffix': '(3) [702]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '703', 'suffix': '(4) [703]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '704', 'suffix': '(5) [704]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '705', 'suffix': '(6) [705]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '706', 'suffix': '(7) [706]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '707', 'suffix': '(8) [707]', 'lines': 4}],
              'paragraph_hashes': ['d2ec5669fb88790caf0af0a40c7b2f9fb18c39a7f4cb25676c36d4db148f5461',
                                   '4c55492b50c64f0a39895d4700f5656e56667e1987db111f03314c348fe96e3f',
                                   '478f69b720c1afd3869332554008ed475e15ff5797a5052e3b3dc6d498752abc',
                                   '89a4995f36f61c890e6e8aec4a05b7b0cb439fd02806e852a6155d5baf2a1506',
                                   '4690b12bbcd692d4d4b547072fe89a24f15a971226ce2af670f11485088cc5ab',
                                   'd2e74645826ba3c24999d159604e46505af623fccc9875d3e49c185ba0d9241b',
                                   'a703953fa6ce03129ebb9b170f859bfeb28883d0e4e0fde2d6032c22c13c3f00',
                                   'ec94acb75a31e910730757d0627f615c1268a3a4cdcca6b78978ec7af4a290ce',
                                   '9e9e516613a97a36c7b1633fc1a4b74c6884f505f051fce6eedc970f22e2171f',
                                   '7da9c137cfc8d9b459a06a6be4a881f3f788e2cf195314e4733468db1a81dc53',
                                   'cfc28a2e1d2e7d3a1abcad7915cbb58775489f41eb1ece4b1d35eae08360b997']},
 'tha-ap16': {'raw_sha256': '437bc295c0cb666f5748fd6b178cccfa143051cbea6a473046f825dcfbb8504f',
              'body_sha256': '78614e0e979fcbdf8cdb18349b338ea5cd748a63dad65138ed07dac6703da303',
              'notes_sha256': 'bfb09aab03759d2226c755dbb64d9d5df6cb17456ad58d0609915a425a60a34c',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'de9fac688830b19440fa54649dd93f7dc2406d6ab05dd5149bfa4cc53b8d972c',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              'layout': [{'local_label': '1', 'publisher_label': '708', 'suffix': '(1) [708]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '709', 'suffix': '(2) [709]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '710', 'suffix': '(3) [710]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '711', 'suffix': '(4) [711]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '712', 'suffix': '(5) [712]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '713', 'suffix': '(6) [713]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '714', 'suffix': '(7) [714]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '715', 'suffix': '(8) [715]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '716', 'suffix': '(9) [716]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '717', 'suffix': '(10) [717]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '718', 'suffix': '(11) [718]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '719', 'suffix': '(12) [719]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '720', 'suffix': '(13) [720]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '721', 'suffix': '(14) [721]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '722', 'suffix': '(15) [722]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '723', 'suffix': '(16) [723]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '724', 'suffix': '(17) [724]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '725', 'suffix': '(18) [725]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '726', 'suffix': '(19) [726]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '727', 'suffix': '(20) [727]', 'lines': 4}],
              'paragraph_hashes': ['9633ecec4721f86ae50eaaa208435973231c219dd6e6cb17efe65ddb659ddebc',
                                   '8a50ac7d2ab3aa729a639a788927438c4d041aee48b2f8490d811ae62ee5a235',
                                   '052ece03fe78d3cc0f7e645e61426e14260a6e0e403b6a34c16d9dde513ad138',
                                   '2d0c8db08e37ddaada45bd94c2be93b1fbc813101668502693973486ca76e99f',
                                   '566ee737abb9158225b2b7bbde82c876402fd1727115d5cca1777b6a2af8301a',
                                   '470a07174fbde18536a3da92c861329e87f2b6d1044d535320887eeddb0cc6d1',
                                   'e785f1db89721cf869547aeaf44b01a3413bb181781e33df9e5396260167428e',
                                   'b207d184e0a5b0c6dfafe05aa6f5a54e363646cdd158b91eead387ed33cb72b0',
                                   'e75def038c2a250461078445c57b3b04c28defd6c4573347568eab7761cfa19c',
                                   '0c5973844c7ca1161e17554ccc1838e183d77a6df42df5597eb47b5701fbd0ee',
                                   '691cf68555a3e6b43d9742cd3987dfae519db5a061ad089bdf8152bb7d17bd94',
                                   'f3f4a946b1383aeeee641e7fb4eb44ee01557c69fc8ad027f3223edb83289033',
                                   '11d921b23df1d533fef8b8cd8e612dc53c9ced3e36895b4e2789ee5297cc0156',
                                   '75ec1fc3aaa28968c949e57db699ec97b3bcd09568c45a2c58c6a80945abf605',
                                   '943c816ad3969cb2e9eee83eab0893c93360426d3d6e10b57341fd465675b101',
                                   '3dd783b04bfe4449fcf832ff29a3edeb3ebf6d417d51dafeb04abb6ba78fd11e',
                                   '535756bd29fdcded0d4b424dffac64e1f343b3470ca740ccc830bfcbc8b1abc0',
                                   '2c5ce173e7512f93dfbe46df427264d137d7689067436df4c157d2a2fc5a9e61',
                                   '7f3f24a0271c13596350869bcf1482bebd4b8a573b658f011caafc158d36d28e',
                                   'beee6751205b4974d453b005853ebfd3c65def6cced6224833cdc302049ed342',
                                   'acd4d54b9f75c326e73ce5f0fc61b2e03e9234f0d3fb5831656c4978989e29ac',
                                   '3cf7ea2c4c55033aedb08fc0cc6393c80dc0926b9b8669a45a93e3f532e1b8e1',
                                   '8133cfd7bef1c82db94879297fb0a4cc0fcc99a66bc310f188d55116f8c572a5']},
 'tha-ap17': {'raw_sha256': '964f1474ef9ae7f8e8beb8e49f46cf8e8706b7401a027db8cfa963c8b5673d9d',
              'body_sha256': 'cecc63373338bdd2de2f5e3f6036fa1952ae2e8754b7f92884f875cc958fec94',
              'notes_sha256': '4824b15af009b38892e364bf1be93dcdbc7d704fd802af3c4550443191a8e82b',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'e2f213d8d349cc8ced242c691207b1f605859a707113977a70e9ef7fd873e01a',
              'notes': [1, 2, 3, 4, 5],
              'layout': [{'local_label': '1', 'publisher_label': '728', 'suffix': '(1) [728]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '729', 'suffix': '(2) [729]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '730', 'suffix': '(3) [730]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '731', 'suffix': '(4) [731]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '732', 'suffix': '(5) [732]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '733', 'suffix': '(6) [733]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '734', 'suffix': '(7) [734]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '735', 'suffix': '(8) [735]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '736', 'suffix': '(9) [736]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '737', 'suffix': '(10) [737]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '738', 'suffix': '(11) [738]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '739', 'suffix': '(12) [739]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '740', 'suffix': '(13) [740]', 'lines': 4}],
              'paragraph_hashes': ['0e07bb80f49e6159791f0184b7a20884fff5e712f68bc794ea256da48e43e7e4',
                                   'd68db27e82c1c4f0616db019277c87316d576c0a2c5a61c3ef15a973efe67cb9',
                                   'bfd2c2b7275f1df14a6cec8e18aac517e8160c116dc825854eb3d79f5da90d42',
                                   'bd71c98758d5e30007e0d3425c8c397ae6b772e113108369cf34edd3ebe4a5ba',
                                   '2c83fa4b793e12df0d7a3a925113aae0bf4ad28bf2c1a5e30b28bb5500186b95',
                                   '1bb74efae1792cf3412137be29b4c1db2866268c42881cdaa99414e54a2a6bf1',
                                   'c48af66a22418b9de9d8d06b71c27c60a525735c07590dee13f52a73c0a39486',
                                   '1e08048d96626ee4b4779511e6c225b478436cc3f4f62b3141266499cd89a3f9',
                                   'a70eee86491c58fee181a8b951c69e1a0bd1b8c577226fce90ca8c3635c45df1',
                                   'fae3d2ecc03c78ef6dd1fd67f7253b24a8a76afcf4bc17b2d5dbc577aed1e426',
                                   'dd726b6b96d1a657a7dee9efc01e35e4928b3ec279ee650f8b020b9d3c547902',
                                   'fdcac931adfcf3175ed9ef5ad6eb0ab856a6230dd14a69fcb2374246c9fa86d4',
                                   '649d8663e63dcc9598380d9cd00e3768246516c8cf7cbc517786f8772b1856c3',
                                   '5375028e592637ed19256b7163d89f10085586d0b4aafa69b63cb17249e25259',
                                   'fd62a7cd72b48bf39fa674f4fc686e51eb1fc82b66879f1c943df10f17503f5d',
                                   '4a2b4c06111fd1c548b83a6e097a689bf70c3ade5fc4bb315d945acd23ebe56d']},
 'tha-ap18': {'raw_sha256': '91c83bbe0617e9c990ebf52736f5665227a5689f4a0a16fca6d23ac19d532a60',
              'body_sha256': '91320bb382f7fd78363e6fa91b30c5986d1e320eb7bfa2defce9770f04625a9f',
              'notes_sha256': 'b4bebc1dbb478a9423fa84ca3e923ae75ab178f58d4e910b0fe7b7d32fd92f7c',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'bce81027fd6ba27eb68534307ece630faf2abce9d40d6f584ce2bcad04732a5d',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
              'layout': [{'local_label': '1', 'publisher_label': '741', 'suffix': '(1) [741]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '742', 'suffix': '(2) [742]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '743', 'suffix': '(3) [743]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '744', 'suffix': '(4) [744]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '745', 'suffix': '(5) [745]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '746', 'suffix': '(6) [746]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '747', 'suffix': '(7) [747]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '748', 'suffix': '(8) [748]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '749', 'suffix': '(9) [749]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '750', 'suffix': '(10) [750]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '751', 'suffix': '(11) [751]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '752', 'suffix': '(12) [752]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '753', 'suffix': '(13) [753]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '754', 'suffix': '(14) [754]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '755', 'suffix': '(15) [755]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '756', 'suffix': '(16) [756]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '757', 'suffix': '(17) [757]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '758', 'suffix': '(18) [758]', 'lines': 4}],
              'paragraph_hashes': ['2d533d3bfbbb966c52d06be8995e48e87f7abd7740a0c72e4696b6a3391bcbcc',
                                   '3274e7df0ba6938b7f26a51fad41c2d26d8a861c3542cf179ccc2885b170499b',
                                   '255c3af3774e21c26a5bab2fc3ce7607fa9d8d4112355428cc10e98d2f1f47d0',
                                   'eee832774975323acad73477c30e98cace643caaa016767308186a6e76b80531',
                                   '6405d571103cc9287c74b19c5523a1047f56bdd544d3550b3f20cf4774466db1',
                                   '4378c4f7365bbfc5082d26cfff1611b8a1f4e9f8680ad363fa24e936edff7350',
                                   '5d492ee13b2f3347664bfd75199dd3cfd4dde3710201d53235a133610c82b1b2',
                                   '8cf26877fcebfd71a592484317c26b49ad50f36d9cf6c52ff9883f01679f6e42',
                                   'b6816357fc1c027c8d0d237830c271549db8ae2bbdfb0705eafd54e3309a4c23',
                                   'fbcc48a6c3165fe6bddcbca04a48bb73eaff9187f987d5756676d75ffbadf346',
                                   'd460d893ddfdad940b094a33b2351f0b037118bdb91e112c534103ea0d7364a2',
                                   '892de28d7767e5631c19ae80cdf5146db873103878287968a00b6a4e12ae0205',
                                   '923d927ef7e3fb5a3abb9e78234524ad87b71d4a54fc89b9c116a6c8f070abfd',
                                   '46c11f4b233ea0bf08469c38d80376221e4e06b076bf7f077a0127c98b26f84d',
                                   'a0954c26adb578b6a7ac8aebd5393c231fc878dd941421c0f5f1d1b3f8e279cf',
                                   '56fa2dd033f245b7468cafbf34c649d061891b2c9d641dcde6a2a239a4ffbb30',
                                   '6ca585ee0a3ab741d60f7af628c471d19d19535b4fe714a7e53c73121ec3b0bd',
                                   'd83103d8e93c684689e7d4355c823f475457756a38d317152b8098ec35106a9e',
                                   '48553c12de62ebb90672d64cfa6508fa04436646f080dd70b84f7abc2cec646a',
                                   'b402fe488cf52e642d89990e9752116bdfbc3bb0b0a865b938a630dca7c77070',
                                   '2c9bca91ab5a4d03a39251f494104de7e7fbfddd44779659f76d9b3a7962d0fc']},
 'tha-ap19': {'raw_sha256': '18869a8dd0ddde2ad64d4f2aeb7c6e06c9b7a4aabed384afe37db5ad22cf65e5',
              'body_sha256': '6bf3fbd4c089478ad3bc7f7a96c23fa4e9f87e43bc18fc84006439c4c1303554',
              'notes_sha256': '86b3f69b58c0427bb5faae8f40b594024d545f8faacfaff4531ff3ce6abe9fef',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'bedb9a1b62717941fb7a6eb1790e2d1b260db21f45cb0c084ffc0d4661310505',
              'notes': [1, 2, 3, 4],
              'layout': [{'local_label': '1', 'publisher_label': '759', 'suffix': '(1) [759]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '760', 'suffix': '(2) [760]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '761', 'suffix': '(3) [761]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '762', 'suffix': '(4) [762]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '763', 'suffix': '(5) [763]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '764', 'suffix': '(6) [764]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '765', 'suffix': '(7) [765]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '766', 'suffix': '(8) [766]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '767', 'suffix': '(9) [767]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '768', 'suffix': '(10) [768]', 'lines': 4}],
              'paragraph_hashes': ['934363e5b0182d3dfef6a0ccc1b7615ba55302ff2aa3dd0aac8b740aef177db2',
                                   '08820817ccb417182ea197ba7e40e2bcbe4299659127a157ea194fc1a1e9bd91',
                                   '86106af0a42004ad535e8fe51aef4923a905cf914d7925e436d364de10e25f68',
                                   '617483d343015bbb43fb5b8c2bd51e020877972e5261471079aecb2da78eccae',
                                   '9c457a1a2a96c6b4ab2bfe8e93b31da05bc95f2f0f776349e356680d6b6afac0',
                                   '5142fa2baa99d3129923a55f0dde3aaa68980742f67dbf0342716c3926ab79de',
                                   'acf6ef43378616f2d3305c322b10465b0c8f8f802b6dbfb648dcf305468641ab',
                                   '517168e22a15d18518f7a3f628e177c581d462273b082c05d8e62bca2645a7ae',
                                   '6997620c8047e210488bc22713d31d883c59bace3fa3b3cc26b44168ae8e4fee',
                                   'afebd60806c8b091eeff2984d6c6b7020a6f328d99e0fe8d340a2baa3a2c473f',
                                   'e83fc38963ed66465e22b4cf5a1709a6dd45c04f54b382b87848aee428942644',
                                   'b388bb49b8f797e8156a9f0d7a45760ae8f4e70db25579b885bf3c351ff36bc8',
                                   '5c5760d068b3a277686ecf7dfabd1617b6e05dbc43f363eb6936c06480f55c42']},
 'tha-ap20': {'raw_sha256': '402b35c86c8e029563f285f193e67115b3c009f1738b98ee4123c31c7d8a994d',
              'body_sha256': '44f232b5ed12cc96085ec14550de8f39d0ab85f7623a517861e88c039960714c',
              'notes_sha256': '68cd1f5656f7aeec165ac7ce0836eceef0a9e2d89598906ed601b4d48afafbf5',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '9ea073a89739013aa0cb8a36046c822cfd1692525717476cf0c38c66b9bb203b',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9],
              'layout': [{'local_label': '1', 'publisher_label': '769', 'suffix': '(1) [769]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '770', 'suffix': '(2) [770]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '771', 'suffix': '(3) [771]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '772', 'suffix': '(4) [772]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '773', 'suffix': '(5) [773]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '774', 'suffix': '(6) [774]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '775', 'suffix': '(7) [775]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '776', 'suffix': '(8) [776]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '777', 'suffix': '(9) [777]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '778', 'suffix': '(10) [778]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '779', 'suffix': '(11) [779]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '780', 'suffix': '(12) [780]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '781', 'suffix': '(13) [781]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '782', 'suffix': '(14) [782]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '783', 'suffix': '(15) [783]', 'lines': 4}],
              'paragraph_hashes': ['a26e7cf6e1aa28e7b36c14ad8a7421e4faeb0a64292d74899a81af20fcd8ac94',
                                   'd714d5252361e5e6e4620f0f2572e3ec5cad307c1db70d52f9af909070e50752',
                                   '7970562f35b8876fbfa1287cbfc3b521fb6d24d13dd7b4ee78109da8bc06fb50',
                                   '7c8dfb70dab21935886f6baf284a87c9057ed06aaaf2d3805550ce5f4fba24fb',
                                   '16a20cbdbd27ede59cc563560c2171ba690b91756c6674a04eceb004ab8c114a',
                                   '6cdf2aab27691baf0b5a6d2904916fa4a11274fbc9e379ab2b19b0e12824264d',
                                   'b3ca33a777feaaa197e754342dbcb1b97cabe767d4de297ef484c1ef75bf5610',
                                   '4cd186226e1532cb7f0c7c67ba58fbf318710700550b8aec4bc19760b286a08a',
                                   '7477115cf7718570e480618c885fefc380f78c9ce08979d51c0151e7a844dd9e',
                                   '1e9cfa00dcb43f40744c3f50d92df0c790b1d7a748289d0857dc93a927aba422',
                                   'fb4132368a735da352b1f57c46ca5b178706bf795e2eb288ff087eae6dd99de0',
                                   '610afb6ba27fe8171a8a367a272d60ab10bc2a19f8cb56c27664c51b1d3919f2',
                                   'a28b14d8bdd9a844830179913917a143d03455502daffe55008aed67b76f7179',
                                   'ae85dd1bd5bc9f840d91505719dd47a52b870f949d0ccf9c9409586ef7c9174c',
                                   'd2ac0013138bc0cd921b178e5d9de30eb4762bd519adad89c68e250837167db6',
                                   '0546f0a4b6e53a026df2a005b02631be794bb87e779db1898942d93ea8df2f9a',
                                   'f7428ed9abd0cff2339e9b2ce8383339439a8ca1c979dcf3b5a6eda5b09daac6',
                                   '9efb0944182a245e67e896c9dc08f38674c8b3c3fa8a3a3b9b41428e274513f3']},
 'tha-ap21': {'raw_sha256': 'ba0f686ad14d24e6727a452643d169076bbc61fbb9c20deb53656e1410def70d',
              'body_sha256': '23f7b079bd22c3498e177a573c3c5830a3dff2b459047ee67464152465ebf4d3',
              'notes_sha256': '0875ae46726f02e4e1c4f232692e74641f89882ec3b5e6c0790425a9180f1043',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '26b43db459771d94e21223882a952d68c3b895ae3cdf2e2fb5f5ff264cb81f5c',
              'notes': [1, 2, 3, 4, 5, 6, 7],
              'layout': [{'local_label': '1', 'publisher_label': '784', 'suffix': '(1) [784]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '785', 'suffix': '(2) [785]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '786', 'suffix': '(3) [786]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '787', 'suffix': '(4) [787]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '788', 'suffix': '(5) [788]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '789', 'suffix': '(6) [789]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '790', 'suffix': '(7) [790]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '791', 'suffix': '(8) [791]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '792', 'suffix': '(9) [792]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '793', 'suffix': '(10 [793]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '794', 'suffix': '(11) [794]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '795', 'suffix': '(12) [795]', 'lines': 4}],
              'paragraph_hashes': ['2a7ebc2bc6d863c870b8928fe4b26a016d8b2385a8ef090197c8b6a71a84d164',
                                   '1298190d12e7cb04fe5fead49ae7dd3f526dcac7e816eaf887d381ce0e73eceb',
                                   '8503eb060024f37c3fbe75866849b789258d6e7961fe71a2bfa63145818c45c5',
                                   '91c113c378c3411d99036c73e8471487990466fd343845d23f206e1146f17684',
                                   'af560db745fcf4db66c46a5d5c273ddddaa299ef3a6c585763865358a12219f5',
                                   '54d4ed67c85260ed8cbb5db2e9f894b0b08ed0b2022e91e7cf299df6747dfe9d',
                                   '2f6e55e2054c26d58f59d32e2f5f2723143e8491816005b63e5909f2fda41816',
                                   '47c181c6eacd8123209d5ed122af02518f7b8ac1566cbaf5ae81482168aac5c1',
                                   '6f1a7d64fadcd927bc4bc49af0aa4b5d9524cbf8d58532e92714342c048df273',
                                   '9b0f2080c05e4cb5c41bc9e580834181f8483164243b1395309babb42b81d47e',
                                   'ad7889e095d5871fa398c64bff03ab71c7506afdcda1fed787ca9cee5f3f7d23',
                                   '33261834e2c5042a182aa53f15bb5cd85da6239d7ee7dd3c99009b45d64f47de',
                                   '2482060f13ae1cbd3764a76d4704aad960cefe6cbc7982451b80465a71c1256d',
                                   '2998ef41065408ffb32a133a9ce9ced3b31d0093a959c7a111056baf99c71cd7',
                                   'e986a44fd145570cac18e3aaad06f2eb563f14c36fa11ae5e40514b58263ff5f']},
 'tha-ap22': {'raw_sha256': 'af37d487b0589f55974e03a17759c53d5bb0f5a1a14ec291889b537200a04c7a',
              'body_sha256': 'cb7bfdaa8ec6a76863f3c8f387abe430155ff0419a22297bfcbc7cbc89dfd1cf',
              'notes_sha256': 'a2b448c25aef43214a53d87c047e8b10f50de0bfb522879abe437209bc846f9e',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '542be43c53a47e32abac3405cb3a510ddca180074fc8e7bd82a78b06fd9fed4e',
              'notes': [1, 2, 3, 4, 5, 6, 7],
              'layout': [{'local_label': '1', 'publisher_label': '796', 'suffix': '(1) [796]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '797', 'suffix': '(2) [797]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '798', 'suffix': '(3) [798]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '799', 'suffix': '(4) [799]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '800', 'suffix': '(5) [800]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '801', 'suffix': '(6) [801]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '802', 'suffix': '(7) [802]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '803', 'suffix': '(8) [803]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '804', 'suffix': '(9) [804]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '805', 'suffix': '(10) [805]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '806', 'suffix': '(11) [806]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '807', 'suffix': '(12) [807]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '808', 'suffix': '(13) [808]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '809', 'suffix': '(14) [809]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '810', 'suffix': '(15) [810]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '811', 'suffix': '(16) [811]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '812', 'suffix': '(17) [812]', 'lines': 4}],
              'paragraph_hashes': ['f2ed7d0839924061d7622c1e93b0bb933c67f37aa0250480df32f5c3eeb3b19e',
                                   '01d71c4c51d3ec1cc414e46bfe11f90eac1ce5620298d77da3b2df2b4cfd75a3',
                                   '0477d3b1f2de4eae7afe3d833a1f69c2ce659e76b9e65b2667a5dbccd8003c52',
                                   '79054100e3242315e09f147b7a1d4383a37821ffd3c020e2647d6758327ce941',
                                   'f8f94325b5ce2b1ace1b08c40c68621199661441306880a0f4565c57f88143a1',
                                   '2a494c2805f198af9d2be84643afe907aa8766d994e85343e194aec4cb1b8e8f',
                                   'a078f8308143bc09e495c0b5a1668939ee353022cec64a035de6da3bd3ac695d',
                                   '99f336308a8483292fc1edaae9b4266de0c6947c2940d8196b9ae748b5562486',
                                   'cac12682a931620220385ea91dff82fcb97e349f89a01b319c19dc411b34c6b1',
                                   '5099bc5da50bb40516b475c2b8251a2d927da7cd4ebd57612035d01b569431b9',
                                   'e3f8b8a406b104aae4abc06269969c85b28619fb4eb189f4d29c7fc9d6f6e5e0',
                                   'c5b8eb62782b73d5b701db7235fe96f49e919db917b66e271791bd1a83bc2b2f',
                                   '597abed2df77642f7c0079adec23aa0b5cf2a7ead99762955ddc746b2a5a9247',
                                   '6b34cb130d06afc106673e4a3cbd15188eb7fde0c1b1eee8ade0ab074ee421c9',
                                   'd630fca2d05d766b69b8d5330cd94505a19ba1e0768fef629dd68c1e5b0943a0',
                                   'dcd239d2a4a759414d10b9d25b70b1e30adffb92f35717bc1e75cf5af0f426d2',
                                   '3da952534f230ad298c822d6aa80ff18c5d9609dd69b73e0b90ad9d6f6d8f248',
                                   'c95facb62b513e48348bfa9291dc7a5efee03cac23e9b7a911686435995f04c8',
                                   '6d943e4e59335dc92f551f6885cff59a66323da3975f9546499333b9e34779fc',
                                   'e1ee272b355f63c48825f18584fa8833d46bfd3f33584e60751fafcd60a146bb']},
 'tha-ap23': {'raw_sha256': 'c4ebce7e1186c7bef4d5e8f139a6bf80ef82a6c020e37ad2639cc1e43a934861',
              'body_sha256': '14a6694b9ab900194c53729776c072bef05613401fab82d78f774ee42b2e6a15',
              'notes_sha256': '7b615b43aa48306da99c1ad58c1c08303b352efcaab5b8ff34f27acb259dd8b5',
              'paratext_sha256': 'c793b2ebf08a75144519792f587328262611e0fe04002ab8c3e898512e348f3d',
              'root_sha256': 'a68bdbe0e1cc8e5f810b17a903fe234a02430782db85d0481f796f9e26dadd1e',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
              'layout': [{'local_label': '1', 'publisher_label': '813', 'suffix': '(1) [813]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '814', 'suffix': '(2) [814]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '815', 'suffix': '(3) [815]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '816', 'suffix': '(4) [816]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '817', 'suffix': '(5) [817]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '818', 'suffix': '(6) [818]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '819', 'suffix': '(7) [819]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '820', 'suffix': '(8) [820]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '821', 'suffix': '(9) [821]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '822', 'suffix': '(10) [822]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '823', 'suffix': '(11) [823]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '824', 'suffix': '(12) [824]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '825', 'suffix': '(13) [825]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '826', 'suffix': '(14) [826]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '827', 'suffix': '(15) [827]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '828', 'suffix': '(16) [828]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '829', 'suffix': '(17) [829]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '830', 'suffix': '(18) [830]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '831', 'suffix': '(19) [831]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '832', 'suffix': '(20) [832]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '833', 'suffix': '(21) [833]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '834', 'suffix': '(22) [834]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '835', 'suffix': '(23) [835]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '836', 'suffix': '(24) [836]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '837', 'suffix': '(25) [837]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '838', 'suffix': '(26) [838]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '839', 'suffix': '(27) [839]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '840', 'suffix': '(28) [840]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '841', 'suffix': '(29) [841]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '842', 'suffix': '(30) [842]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '843', 'suffix': '(31) [843]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '844', 'suffix': '(32) [844]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '845', 'suffix': '(33) [845]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '846', 'suffix': '(34) [846]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '847', 'suffix': '(35) [847]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '848', 'suffix': '(36) [848]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '849', 'suffix': '(37) [849]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '850', 'suffix': '(38) [850]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '851', 'suffix': '(39) [851]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '852', 'suffix': '(40) [852]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '853', 'suffix': '(41) [853]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '854', 'suffix': '(42) [854]', 'lines': 4},
                         {'local_label': '43', 'publisher_label': '855', 'suffix': '(43) [855]', 'lines': 4},
                         {'local_label': '44', 'publisher_label': '856', 'suffix': '(44) [856]', 'lines': 4},
                         {'local_label': '45', 'publisher_label': '857', 'suffix': '(45) [857]', 'lines': 4},
                         {'local_label': '46', 'publisher_label': '858', 'suffix': '(46) [858]', 'lines': 4},
                         {'local_label': '47', 'publisher_label': '859', 'suffix': '(47) [859]', 'lines': 4},
                         {'local_label': '48', 'publisher_label': '860', 'suffix': '(48) [860]', 'lines': 4},
                         {'local_label': '49', 'publisher_label': '861', 'suffix': '(49) [861]', 'lines': 4},
                         {'local_label': '50', 'publisher_label': '862', 'suffix': '(50) [862]', 'lines': 4},
                         {'local_label': '51', 'publisher_label': '863', 'suffix': '(51) [863]', 'lines': 4},
                         {'local_label': '52', 'publisher_label': '864', 'suffix': '(52) [864]', 'lines': 4}],
              'paragraph_hashes': ['58883e61fb5d21aabd953ea302ebe10d5d7c59a0d1cd5a3a0ead73097142e4b6',
                                   'e7dd8bed2eaff0d1cd129460d77db605d87340a5e536cb30e0e39aa9ed6249db',
                                   '71f4a90fb8b563b9248eb4d41e6ec67d2cdbf76db01f635d2419c187b05140c2',
                                   '42fe3309d0ece84078a9dc79e2bbd418b454ccebe3a315ddb539039139307e01',
                                   'ecb4ae3b6cbab4f21399ab0dccc5e9f97487cc665e9735d1c4d4db5011ba621f',
                                   'fcdfcfb692709741dcaf36470f301edc38144aead134e346289e918b75889732',
                                   'd4980ea805df28a489dff5a34565d4b70ee896d41b12c128c6e2b4d13be349a3',
                                   '04f30e2ff161b7b3568f0987269000534e2c6fcdc396f0c450153528078618ce',
                                   '978d16a8f2f29eec185d59f158b775b835a268a7d94306fcb8bc3cfdb2bfccad',
                                   '4877ce89fd74332d115515566047ba23b6fef0b9f1b5c54c2809731d2169cc59',
                                   'cc2a88cfeabdc6145ef1a6dae62fb9176ac182294f0344b68079f95c9328efc8',
                                   '105451871d3fab20054b9863a2646dff23f677466a3019e234f62bd1b992f666',
                                   '9d020161c032fff03bceb84b4c6b57e6a42059a4d19101498a82a95cca512a8c',
                                   '06c7ea848746fc80daf733793214224352a2e7ba0cfcddc9530cc91477cd7cc7',
                                   'c93d49c59101d761dbade8b8cfc6c6bfbe9447e1af23df5f44945c868242bc43',
                                   'a7795b849a469338f9bc29274b92e9699597100ccec86dd458ae274032e504c0',
                                   'e7cf8df8623a74bf3de7e9cf301e09d770b387ba11232f1aa241f01a7eee5955',
                                   'a12220825eb9793548c3760bffccff440fce0d37b54979a6c0ee75086c951e8d',
                                   '72dab3043e8261e9d9b347a9a9e8e2fb1f9b3350a0aa9671daf8ec8b038c1061',
                                   'cbcc0013253b78d32f1900da117a5caec172c8f4921e590edd9efdd55b755739',
                                   'd7a767cf27ddb3f437058bd9f7fbd23b8d65586d920107a59457357de9a69fbd',
                                   'aa9238e7331138e8a1b10ed05786d52e862753a3327a3d4c246911af4dc78da8',
                                   '8ad68e1203ff1f91309ba98ff41e8076a9fcc0b22ee5fca1850ec5745f780a2e',
                                   '49b2f9faed95f45cb96b8e0b2c8b15344d0ffc6bb6392210fc27906d3957951e',
                                   'a4dcffce42ebfc808bf0229c5314a186e41bc3ddadf3dece68c30119835664eb',
                                   'a3df9d6da4afa44530d15abd46ca4a3434a619f0474057c28d281a2a3c8e8aab',
                                   'ed5a047550f563e2eb3e6e46359a2afa9009583b4bf36b35d19076e0caf97aed',
                                   'f9834bdf92b1b03c769730377e9cf95c7284e6965a5006db2496bf44975fc2a5',
                                   '63daeb2d7926437de15e0ccadb1311834aad63d20e15785165a610fac3690ed7',
                                   '9dabfef8bc68f6749f7e5ea95fedab661327054fe13c7b677f4616e9ac780524',
                                   '3d64222391cb3983724051380bcba146a9ddbba5cd1b757093881cd525a29ee1',
                                   'f2d7b14008963bec4737c4206207e1b3bddc81a58b735cde603aad58124473ce',
                                   '0f8d007997c0b78dc7a463a90bb875e3d6fd104021f43f0db46b885472a42cf5',
                                   '82eeb658ace83371a01be7bcbed2ccc6ea9f41723f39281dab981526d9e17737',
                                   'a49a62cfa64a98a6e2cfaef8055ead0b060bebd4af985c28415af21ccca2e494',
                                   'ee94627c97ca0850d6206205765aa59e09d52f276c58ae5fbc839fd5a36290b2',
                                   'e5d86f39b7f72fdc08d07fe53fa956d8e43ba6062097fed28e00773063007bbb',
                                   '378f57e826b5aba6f332d8afa838bbe2c3de477e7d429300781ca4b86a62a793',
                                   '64a205af56bd4153c6782984b02d0a25dbb085801f97af7c0bc73456705006c3',
                                   '5418cc98ed91062841ae7eabc9bbd4250288682eceaf7ce78b25b93d3d4b1fa0',
                                   '43dee09b996043a33c21893f3bcb839ed244707aedafff648c2514c050bd87d3',
                                   'b25d773b4f4c17bc0a5e35dc701af676610988ee3838a0412fcea994574e6774',
                                   'd5ebab09a8dad5d0081f468fb5aac47c84d10a96c91de443d6d175c0cf73b934',
                                   '496890d6ad51ab9f17ff2a2a186820973629ba933c8402edb76c21f07ad3fb80',
                                   '336fe0ea5b1fc536c837873d4cc2a371297126f70f2a8f49163d0d095c8af9c3',
                                   'f54a4b07fda73da9f238163e938314b44d995442242fb76bc526fc8bd87809b6',
                                   'e5fb6b011d91e8a3cdd5bc8ba036e0af96815fca19307ba0f4312a388502ebc5',
                                   '0f33405169df0e045bab9ba881c1a527145fd1754b2b232dec160a7b38a17176',
                                   'a68ae4b04a187104bea2a66a00041e82c378a620e970753b2a70d1546f802347',
                                   '52835518d6f7c207d4963ba1efc2ceaf16016b6be49662d91da0d5a7ef2fc930',
                                   'e099e60ea4572789629d7ba468f5afe3b0d306a5302928108006a4aad3bdb5f3',
                                   'da08807eb2f014c53b29fa65395de6ad5a9eb3030756c4dad38e6fd0146a2b15',
                                   '8fef298ea1bbb624d4d57ea9c4195fb365630e6dbb024fc07150ea716b751081',
                                   'bfee6db80030c39d088e9c529f3d20a027e27d9ab52cbf35e28692b5a8ccc15c',
                                   'dfe0431343256e0a2c2cfc68fd7cb0c331283b3d5f06fc779c3f7fc653f0a804']},
 'tha-ap24': {'raw_sha256': '48e1bfe4ecf97f288afeb1d487946fa63bb37712866b3f343d76a5410e0982fd',
              'body_sha256': '3fc618d36130367f61065ab9f52742466f6ea10100c80ea16c7150970a7422e1',
              'notes_sha256': '7c6540629ca780c97520b7a0f3a9507d4d8d7aab4669c3aeb7819dcdfa359b96',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'abe4d1bc9f57a0f187efd0f0d18247113d641a912ad1d6b7854f845194c75a4d',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
              'layout': [{'local_label': '1', 'publisher_label': '865', 'suffix': '(1) [865]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '866', 'suffix': '(2) [866]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '867', 'suffix': '(3) [867]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '868', 'suffix': '(4) [868]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '869', 'suffix': '(5) [869]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '870', 'suffix': '(6) [870]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '871', 'suffix': '(7) [871]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '872', 'suffix': '(8) [872]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '873', 'suffix': '(9) [873]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '874', 'suffix': '(10) [874]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '875', 'suffix': '(11) [875]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '876', 'suffix': '(12) [876]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '877', 'suffix': '(13) [877]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '878', 'suffix': '(14) [878]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '879', 'suffix': '(15) [879]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '880', 'suffix': '(16) [880]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '881', 'suffix': '(17) [881]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '882', 'suffix': '[882]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '883', 'suffix': '[883]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '884', 'suffix': '[884]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '885', 'suffix': '[885]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '886', 'suffix': '(18) [886]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '887', 'suffix': '(19) [887]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '888', 'suffix': '(20) [888]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '889', 'suffix': '(21) [889]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '890', 'suffix': '(22) [890]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '891', 'suffix': '(23) [891]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '892', 'suffix': '(24) [892]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '893', 'suffix': '(25) [893]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '894', 'suffix': '(26) [894]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '895', 'suffix': '(27) [895]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '896', 'suffix': '(28) [896]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '897', 'suffix': '(29) [897]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '898', 'suffix': '(30) [898]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '899', 'suffix': '(31) [899]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '900', 'suffix': '(32) [900]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '901', 'suffix': '(33) [901]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '902', 'suffix': '(34) [902]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '903', 'suffix': '(35) [903]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '904', 'suffix': '(36) [904]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '905', 'suffix': '(37) [905]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '906', 'suffix': '(38) [906]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '907', 'suffix': '(39) [907]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '908', 'suffix': '(40) [908]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '909', 'suffix': '(41) [909]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '910', 'suffix': '(42) [910]', 'lines': 4},
                         {'local_label': '43', 'publisher_label': '911', 'suffix': '(43) [911]', 'lines': 4},
                         {'local_label': '44', 'publisher_label': '912', 'suffix': '(44) [912]', 'lines': 4},
                         {'local_label': '45', 'publisher_label': '913', 'suffix': '(45) [913]', 'lines': 4},
                         {'local_label': '46', 'publisher_label': '914', 'suffix': '(46) [914]', 'lines': 4},
                         {'local_label': '47', 'publisher_label': '915', 'suffix': '(47) [915]', 'lines': 4},
                         {'local_label': '48', 'publisher_label': '916', 'suffix': '(48) [916]', 'lines': 4},
                         {'local_label': '49', 'publisher_label': '917', 'suffix': '(49) [917]', 'lines': 4},
                         {'local_label': '50', 'publisher_label': '918', 'suffix': '(50) [918]', 'lines': 4},
                         {'local_label': '51', 'publisher_label': '919', 'suffix': '(51) [919]', 'lines': 4}],
              'paragraph_hashes': ['5a5cc4446eccc1fcf761df4a35df6335e81cc1c526aa88940c8003d891241909',
                                   '8137a29d854546bfa8f8426dba9e91d8ec6b87823e91b06e218ce78927b4121f',
                                   'c96659c2c7e9c777ba16fbe84185d1de35b49c1c9471a2dbffa52dadc8b89106',
                                   '2716a9d8d3a93a21309aded11b9ba5bd467da898209452c5c55a131a83059ee5',
                                   '817f0c28e4be43d10a1da818f1732de1596ffd940f089369f043ef91333b3f1f',
                                   '4f4c16f5dbbd877a78e414bea779e78177677df6872b1af428886be9c4f3497f',
                                   'dd988edd0bfca2e9453b0fa0ffb07d69bafd76cb02448993a0a11a3ad16f91f9',
                                   'bd46f6faebabf2c8b3e0d3e950dccea1e62c8f5c1f08e46bff0a52b49895e0e3',
                                   'b10891453bcd83911aca26148b4c6b93b9859e577278d773e0ffae9718c62d52',
                                   'd1f1ca8e774f7720f11d2e2cbbac35df2101e5a35a6f3758a6d63c505f37a5c4',
                                   '4d5adbd4cb5506a882cc536831a9f11d122604178719df5ba79c1966209a3d23',
                                   '544d1b9431463b947e8f4584b8c63b110dc3029b6cc861a04b1af6c7a727c60c',
                                   'f8458c07b1da1fb3ca41119be01e1c7265a5a52668d19a37ae8f11b3377d3006',
                                   'dd68f925186071d2bdda35e4fb1681167179bfd08d6cf5895e61a63b2d8f1d10',
                                   '6880c9760ca2d2eeda7aff32d4bec926da973ade218f24332da0de42a2a383ff',
                                   '490fd99cb616fcbf56852949790fbe80d2148c1b4af8d453b8df74048b8cdc63',
                                   '629b7f9211587c951d79bee86ff84d169d8a51e696103547a95ba2da59bf9090',
                                   '834eb6150d6025079d59a205034373b53ecc291c7c655c77d622bf0c8b5fd815',
                                   '46581b431b59baba755fb5f5a7040df28d043c683fe3258b002f54579ce3d204',
                                   'c1c8581ebb1257930a9cfae1c9466df4b5e15eff40f88885f0972eadaace0af9',
                                   'e3b990f0b92e10d2410aebdb21a66bd461ed20f73ba85873024927805fd286b8',
                                   '4c384e1af5a46c3f029b6c0e72f83228c3184641f91ad69c4edfa73f7a6ca3e4',
                                   'de6ae2d4da7fcf0e76e6bfb2820d2c2bf8929144eae1766b2a1ad3f4bd4405f6',
                                   '0dfad11efbc2196cf2bdd4c3e08eab657bcced33a4fc1d14060d0615bd773336',
                                   '615095477f851ed4e972e1eca6f53da7d4db9612e9abe1564bfa115a27deecc5',
                                   '9ea5a3da40699af74a94896b3f7dafa9d406abd016d46ad3871eafbfd96b457e',
                                   '62f225288b38c1d3a7453e84b1f886540618600ab4c6bd259b5ee34e35156c17',
                                   '087a7066e99a189aff6de899706e251eb61734cd931dfda753cc6edc4c3e0f58',
                                   '5dce53dab5a66ccf0ee96a64dd1ba315eb6a6161014a8bdee854db32f879d362',
                                   '77b0e6a6583c055e20d99a25390a8a450b5743bb1191eb6fe13b31cc9572d7ec',
                                   'f7332de9f3ee3ac1c51b60f836a7d5389a56082888f49bf5baeb638cd01545ee',
                                   '9de9a15ad6b6a988dc1be1bda1e63ef1045e25e1221c5a0ce1f6cfdb7cc25016',
                                   'e035983e84d7e96a973cd84693a1b92932cc37b96ce6d5a1b198e176faff13b7',
                                   '4ad4fef27c569ac754cf691f5849a33fdbce714e2cd9a94cd2f5eabf6f5be604',
                                   'e5ea40f600971325177f594ddbec935987c7b6a437ea184bc80ff8ef801c313e',
                                   '1000644c2c4066cff468af397bf0bf2b24e9b68c144f7df2b371a55d05d92ea9',
                                   '7f8ed11d3e9b55ad6e3264bcce9a2c9bbbcfcf296d471696b7ac1992d07e2d1e',
                                   'bae2e6528aa5014812b5589efcf8cd202c8441a4e2bc7211802442f803c06462',
                                   '889c40977d9c50d14585f7e1eb8b5da1353ff2d8f536d47f40d63b52e404ebef',
                                   'f15de0561c9d1f30e67dc0a927b2a5fbc6368d3b63a0a8512e051b37df010a52',
                                   'a857445a774dcd28e391bd5a0635e10328dbdb39b5beac532cef2d44114db872',
                                   '96dd590be4dbc4208738f2ab57bf802d5bdfa001dfedb0dc39d32873d961deeb',
                                   'ad2e86dc3568135023b425428045133be838e68875e35ae3a20d3090d954911f',
                                   'a35b5e35effe47be0692d136a007d360a9ee38187d44fb042bf8c0153283e062',
                                   'aec0da0b150f11cbb43eeb587f4dc866822b8eb61476709aa8626f33b9f77c40',
                                   'a9811aa16e31eb3cb8d0abbb1d3ad3f4fb738f77fe18a83f5d0395f00bd67878',
                                   '493c69aa8cc98c17b7b453cc7a2d55fd2503a83e2496f2b5ed4d617f32bbb6a3',
                                   '9f61db56f6d2aff29f4ede3ef9653e32499b7b690a8eed2d9274ecb1d4eb3095',
                                   '5f3a18fb0a6d6a5a44b7503adae9550eabe8a12de72b78cd8b53734f556c0d1b',
                                   '4e5958708a9c8ef4cc5cc367a97b9d98ff32c565a200f6ee4bdfee63f1e457d7',
                                   '434dc466e5dd21490506c229c8c7a3d09daece4b275b5726331daaac6d05e614',
                                   'bf904ce2622d0ab310a49326c753c6b9d386e416105bb5b42835e44c94f7f54b',
                                   '94c1cdd327ff5dca8d1a734ada490e40818d1e79caf26a26d0ad71427c315f26',
                                   'ca9f7dc18592cc81fd01c0bc9572a0d9775bfce69f0530362212451ee225189f',
                                   '0ce126a9acbcd2c4f0ed11b24cfee7613d4bf824b47bf68d671881b3fc4e04c6',
                                   'fd7656a9ac741552c44da7bdfc80ee752c0330bb44f0f12968c413a300fd6ab4',
                                   '30dbbebadfb06961e6549f080ca8e6243a7e1a7cd09a497c5833a55619941218',
                                   'df0c86a3e52d762f0910a9689ea181d073bf98e8fa8ff239ffae5a9a6e2d2fb3']},
 'tha-ap25': {'raw_sha256': '19a87a047ed6e3154baba4db31c5035fbde4511d9b7d75e0603255589be4e3a9',
              'body_sha256': '881c135ff0e868f7fe07ac4405b509ed6884292c5e648cf6a59f385bade0ce24',
              'notes_sha256': '9e71ba27abe40d8bdfa5cc2245f8fcb634c32c94b80516e9d7f8d6fa297f51d6',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '561a21624ffc797e021d6c88a93f98a3278e8160d17839ce3d21d87e2f071125',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
              'layout': [{'local_label': '1', 'publisher_label': '920', 'suffix': '(1) [920]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '921', 'suffix': '(2) [921]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '922', 'suffix': '(3) [922]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '923', 'suffix': '(4) [923]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '924', 'suffix': '(5) [924]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '925', 'suffix': '(6) [925]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '926', 'suffix': '(7) [926]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '927', 'suffix': '(8) [927]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '928', 'suffix': '(9) [928]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '929', 'suffix': '(10) [929]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '930', 'suffix': '(11) [930]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '931', 'suffix': '(12) [931]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '932', 'suffix': '(13) [932]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '933', 'suffix': '(14) [933]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '934', 'suffix': '(15) [934]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '935', 'suffix': '(16) [935]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '936', 'suffix': '(17) [936]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '937', 'suffix': '(18) [937]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '938', 'suffix': '(19) [938]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '939', 'suffix': '(20) [939]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '940', 'suffix': '(21) [940]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '941', 'suffix': '(22) [941]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '942', 'suffix': '(23) [942]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '943', 'suffix': '(24) [943]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '944', 'suffix': '(25) [944]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '945', 'suffix': '(26) [945]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '946', 'suffix': '(27) [946]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '947', 'suffix': '(28) [947]', 'lines': 4}],
              'paragraph_hashes': ['540bfb7a2d47d79efdc670fea6a711f7f41a8abf165384a34713fffe096afd23',
                                   '37d9386708bbad54c0f2fa4b427f313b4b2dc4ea03d614312175574c0caff8dd',
                                   '610d5b07cb416064059d5426442f03496283bf2ee0628e9a9de1e3b688a37fcc',
                                   'f8a55296163f6e64552a76e6f82c7a3e4f8c3a256f02edc6aae965555bc186bb',
                                   'b6492bd2d895594c78bde658e7ef2d4cc62363a45ec022ee96161562eecf1212',
                                   '3ef6ef39a6e417dbc304ee19caeb07c3390b0a805435c1baae44311ab831fb71',
                                   'f36062c22d6753909a9eddd2a789c177833c8293b581b9f21b84d6ed92510964',
                                   '0c442077c0e645b25278ee858bc3dcc2acaee625f18ef5968a6cc02b98ecfe80',
                                   '70fa3d70d843c9d41224fee406fc49f24b86648c2a53710492744f6787c11b2d',
                                   'e902f6eae1838bfd9ded0f2fbaeec92f674da1cb206ba5eaad3bf26ab3a71498',
                                   'b22946d5656fce6b3fd3ae9af72b7e475c9891a819ab6908c159b3d4d8f7d01f',
                                   'd5cba44b0dc37602f44278acd5a3414d181d3f2962421a5577cb958c8f1805b2',
                                   'e078fc78d550ee9c74e3878948e632cc5b771b14c0c177e7c580ea81eda4249f',
                                   'a457a1fd31912056af1914e49809aee3e961ec6ba30c31e087d4951cc8925115',
                                   '9d684151ce6e4c9fd7ce4ac739afbd17a7f2e428f7d42719cae0d8293022d45e',
                                   '2d76b34aed38b5638c296d59a3fdad7bd35f513bdff30c96e68fe0afb94483a9',
                                   '10c7a2872d6e9ff7ce475bed6c0023f2c156040e0a19ff998e8f3344adf6156a',
                                   '2e9092a013ae58b8077ec9f14ba358ec1a483e0ebb13437763c0234a90702e26',
                                   '3da4cf442bec0c637d484eeb2f5678b1d8dc67149b41c3efdb5b8b0885255c9b',
                                   '1c1f6d07bfbe71a03b8d56466fb70c781557994084e8bc4f82837faeb0442a40',
                                   'e958550fee0a72aadb18579d7c7214b94fff6103a41953ddd4a07aece91edfff',
                                   'b7e8394e88c1b79964872cb4650d5dc55537de0b06f67b58c4d1429e5b31df6d',
                                   '65f7a7a33514d90f59d0d527c24b82316e5dd2199698c02919b25e0a72738927',
                                   '23491ea55f18cedb7d5967cf9cc8659f6e56beae326d2243e9f22e15582728d0',
                                   '54dd954acee4eaae93b48b6a08c3aa03247638142c88dc8b0b39828713a001bf',
                                   '13004ece3f7739e99d359bacbd96857e147445674a969bc09e209f1b8cbe8dd5',
                                   'fa4a355ad9d279cfff6531f9dd84c1bfa6185005af5b802ed1c3bd536e23f67b',
                                   'abc22348b736661337041f80dcbacee2683fc114f9cf23c65b2e545fc6717a63',
                                   'e014587440ee2ffa99eee7e7ec9170424d05e2421b3911bbef433487a4fdb6de',
                                   'f92a473be2b2d24ac4cefa3418a1c889bcabf0cae566c24828592a53eee6dc65',
                                   '4177fed34d2e42530f02a1aa16a0d2854e93d016b591332260b7c1555072e4f1']},
 'tha-ap26': {'raw_sha256': 'ac4e8d0ec946e4697e13aaa19ed0f81229fed15c5832f5e90fc51516680589d1',
              'body_sha256': 'ae46a0bea114ccab8077b3cec67f5e5f1d96dd16eae8b7570557595d9d4022b6',
              'notes_sha256': 'f974ed1e8ba6c451f278bc3f396a246376a6bb1803a5455ebe3560c9e4742e9a',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '7e89d6c5829b8fc16cfe6ef90dea1611364925027fbc46259c6fd78f446d1ea6',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
              'layout': [{'local_label': '1', 'publisher_label': '948', 'suffix': '(1) [948]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '949', 'suffix': '(2) [949]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '950', 'suffix': '(3) [950]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '951', 'suffix': '(4) [951]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '952', 'suffix': '(5) [952]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '953', 'suffix': '(6) [953]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '954', 'suffix': '(7) [954]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '955', 'suffix': '(8) [955]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '956', 'suffix': '(9) [956]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '957', 'suffix': '(10) [957]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '958', 'suffix': '(11) [958]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '959', 'suffix': '(12) [959]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '960', 'suffix': '(13) [960]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '961', 'suffix': '(14) [961]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '962', 'suffix': '(15) [962]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '963', 'suffix': '(16) [963]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '964', 'suffix': '(17) [964]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '965', 'suffix': '(18) [965]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '966', 'suffix': '(19) [966]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '967', 'suffix': '(20) [967]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '968', 'suffix': '(21) [968]', 'lines': 4}],
              'paragraph_hashes': ['6deea07b41bbffb1f7d2f6e60cc3cc1280d503f99914df98c6b9bd0a9a77df7a',
                                   '3e7b6eae584d56af6f9f11dd5c6fbdb72575bf04a7fbf1255874f5952583db1f',
                                   'be41719326788cf7c8a65461b71e960b97c438aab3a743a500235cc3497e0a09',
                                   '5d7b2453c2f839f63b987e227126ca1fbe9df929cd23c9a0c2322b7a68d33418',
                                   'bb495da8f61c394de531517c5df253d5862dc9a61a83c04a90029c9854469877',
                                   'f9359cf94d730078b946ae5a649fb744264ddeb44973e814b1f52b5b629f3eb3',
                                   '9041d913afe4201f26677f8fe88a316135a706e6d9456ccead8f3c29be8b4ff1',
                                   '5094730db0c226572f6b8b240e46b21ffae884914bb90eb60fbb8f06aa60592b',
                                   'b87009cdd37d40631ef932fed33731aa39afe517043564455bba9f29b13bfcc8',
                                   '803da7ca10dcee2f8bed4e471cbbd8236ddab44b604ff5e19afe49c306a241ad',
                                   '517a301944183a79ae0fddfb5e40fa5b25684569a618db3515dd7eb0c0e9b2b5',
                                   '41dc1e05ba690e12f5e3f9f05a105ddddc610b33e461036bb20fcb93ad7cf511',
                                   'bfb2c6062c450e97529a98f7887e2d252a6eaf5da97386d7a7811b870f11e6f0',
                                   '341703413dc4901aebeaf88ecdb5b838d0718ec947f481bdc24e61152b87ae7e',
                                   'afe00310590e7660399ce9465dc65eecdca0138d708bc0b700d89d8359b8b1a3',
                                   '01ee362ef1dcbd1f2885eb9c83cbf7dfef1adc36cd278d62b0c11086eacada4b',
                                   '13d2aecab20ace632e56566e3dbf1eeb6a1a03e83364854696e63a608d12e59a',
                                   '08e8d30a4245a3c764db79592a254dd854491473b99995fd017c7c61f44f2e5a',
                                   '51f903a0b2440f50b030a0a5d0d00e922a0d4707dfc9c1ce9e7783d442ffc91f',
                                   'be6a0008d9563b5e5e5d0e78033c480c9ff6133550ee005784b12981ca9312e6',
                                   'a518a2ab58a30fb7f5f583bcebb1218f5b786161bbf64954ddd1274f317d5fff',
                                   'b1401e9a8b9a9d43b9c03dbf12e443b70752bfe70301cd1daeacf04d96039026',
                                   '1731a421606cb5c95352c93de7be9d3a7cac28fe67ee5988561fc88ed549aa78',
                                   'aeb3608ebdfbcf176730e8e8b7fb202376a6dfa1a03b20764ff126a2bbc13e09']},
 'tha-ap27': {'raw_sha256': '5f266a1a706d373959501934d22eda800903e1515e244a984a01f0909c3aac80',
              'body_sha256': '9f5d598942a44a04ab33c8ae3e601f908118710b214552405f2e5e39b724141e',
              'notes_sha256': '3f41233efa04f7d14e30f6384b4ce7f4ed97eebbef40ffd851a47ab9f422bf50',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '2cb67f24a228c15a585fcc19390801721493df86709f10d6bef77581c914f370',
              'notes': [1],
              'layout': [{'local_label': '1-2', 'publisher_label': '969-970', 'suffix': '(1-2) [969-970]', 'lines': 8},
                         {'local_label': '3', 'publisher_label': '971', 'suffix': '(3) [971]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '972', 'suffix': '(4) [972]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '973', 'suffix': '(5) [973]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '974', 'suffix': '(6) [974]', 'lines': 4}],
              'paragraph_hashes': ['3ba1eeb644d5a9da873d386a980447db83ddb2f24db810df7b3cf5c2dbf8c68f',
                                   '439694e0f4d71b08efa109c46687e58b832a82669773724a7ae53080470336d9',
                                   '341a1b6b32383865d39874fdcb5d3038d3382f1f77ed7dbc0204d723e2dc2c1e',
                                   '4b5fad5e19a685662365a7b97b1e5681263323273431df2d54cea07d19d0b3a8',
                                   '4ce8b495e0ff8170386374ee2ebb9e16ad22b41be4e760e3fd93299ad42cfc0e',
                                   'e0b86815938cc6fec432485a103eb14bd59f3980b172e16f45aefe8dcfc16207',
                                   '78fa8e7b492821af9ff029e8dcd4167fe8d3e78e5282838c1ffd057a393d030b',
                                   'a5e5bdf8f91ea7faedf45dad6cca82fd109d5cd68224ded6f1b678629d4515da']},
 'tha-ap28': {'raw_sha256': 'ff3f2b0fcec1287554b17967ec7dda4a07dbd40ecb567d692f3777e8e33f8f7f',
              'body_sha256': '562b63462dba2cac5ee0b47d7873579f920350cc779acb89bc3e75367f1c351f',
              'notes_sha256': '1ac7f66c4937376b7e512b055a0084af72e008aa654c853b6a3c08a418ff57f8',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '037c4a8a9a4b97025e1b1cc7c827a3101b7e365b3a9312341e691a6c3777006b',
              'notes': [1],
              'layout': [{'local_label': '1', 'publisher_label': '975', 'suffix': '(1) [975]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '976', 'suffix': '(2) [976]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '977', 'suffix': '(3) [977]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '978', 'suffix': '(4) [978]', 'lines': 4}],
              'paragraph_hashes': ['9baeda29eb8e8acfc33c9fd1bd9cd6feb955d6111d45e10d8b4bf25365e9282c',
                                   '79a3d43f559c426284223eef884e1db81833e31969f5fd8da6a8e0acb34dab3e',
                                   '0f8de1d2345da79497b5d4909092fe64eb898b8258940b5ba3264fbef5168341',
                                   'f2fee4d57d99bb217eefbe16690d85b539fec0f717d99b454a90a165f14bf34d',
                                   'a0f5a127fdccfe585e303ef0e99424505f2efb0aa5c8b405b04bbcd23fcec3e5',
                                   'f1d736610febde95d36b9cc40012b3f379022ad29eec89c97ff7de7c606aca4c',
                                   'ed8f9bdb4e748559fdb629baf5b0046fe3f8b810f13b7d2cdb35f2ae5149b057']},
 'tha-ap29': {'raw_sha256': '378c1b9b5906389bc109a6ec5a940bad480a9c6c57e5f016d4f384efdac4f12b',
              'body_sha256': '5a6234f847667e360e3b3827fc33d42958f20f8b1aac0ed0605244e608d063f5',
              'notes_sha256': 'f7d6d9e85ffa55d12a905ed80b5a90a996d83970805b9bf3b727d3a53e995fc6',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'f1bf9c9ca3bc9a5c2bda8c04da7d8ee34d3179313707510bb4ae652cc75fa414',
              'notes': [1, 2, 3],
              'layout': [{'local_label': '1', 'publisher_label': '979', 'suffix': '(1) [979]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '980', 'suffix': '(2) [980]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '981', 'suffix': '(3) [981]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '982', 'suffix': '(4) [982]', 'lines': 4}],
              'paragraph_hashes': ['87d0fdc41150c138bd1b2c2a6bbaf41e65d27fb5966bc5ef17c873532d44eee8',
                                   '57aef1690deee4fbfcd00acf3d253df71f728e8c3b333cb20c9c26694fafe7f5',
                                   'c3579e2f822f66720cc2e8c3f4165f9aa5bde0544b4efde82f7da7a3f663d43e',
                                   '63eb950baa369a433f02f1d0ffc5eeebdcae5f622929ac6a06d83a1644509e48',
                                   '6165067b659d297062550af9cd9688d9a1276401bbdfc2beba01935d8f7995d5',
                                   'db6b62d829e59e8e37b23006334e3a7bde35b98af4f94e4a341e15fda57b9b80',
                                   'f99c3bcb2ea5a92976e1ed7668f93bcb8926b6e7e5d3bfa0df08fb627b31727d']},
 'tha-ap30': {'raw_sha256': '987137fea06f55971941df828d0657040c583ad7cd564f0e41b6fddeaeb5e728',
              'body_sha256': 'ef5913556eca000e1736a962bdbb3d1c4fd14018cc9fd3fe953152ee3f08a784',
              'notes_sha256': '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '5cea86cbd0244a48ebc134c00392c4401f50764a9405e223420ba214ea378052',
              'notes': [],
              'layout': [{'local_label': '1', 'publisher_label': '983', 'suffix': '(1) [983]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '984', 'suffix': '(2) [984]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '985', 'suffix': '(3) [985]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '986', 'suffix': '(4) [986]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '987', 'suffix': '(5) [987]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '988', 'suffix': '(6) [988]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '989', 'suffix': '(6) [989]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '990', 'suffix': '(7) [990]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '991', 'suffix': '(8) [991]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '992', 'suffix': '[992]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '993', 'suffix': '(9) [993]', 'lines': 4}],
              'paragraph_hashes': ['1a273628fa31b89072f32d5254f989fa2558dbea0a9ea1f2443ab226e50e9ed9',
                                   'd756da4dc0dd59f37f17bd492398705f8ab250ae7f5f60eea7fab41dc2ce8019',
                                   '43c7b72918f553b66c3ef2c964ca4cfd80106cc45d63e5c42a8d2f51bbbd8268',
                                   '0ca11acef1c4376e9a18f356c12b30dda165b03e48a38ba9f8b17f96522d6a7b',
                                   '2f6342a0fdd813856c1904e3be12005c475fe8aba7c0a04e63d9aa4db465f414',
                                   '8c56357edfebc0d30537ad73ac87f45f347c6726f3357c3e8ef30a8cca603be1',
                                   '233df21fccc42070ccb297fa66d4b12777ba00a152770d5688523f9116efbb72',
                                   '14d030568b18885c74edd529d56016710427cb3702cf93d84c25cad980e07c2d',
                                   'b0ef3d9522263f3fa4fe166f6f13b3f8ead89cf20514b2514e950724bc0ac1a5',
                                   '63466245331c38e1bc783bd2b2984d8e4db05bb1e78a296903c8ff5426841eaa',
                                   '507dc7cb4ebb99398a9b57e7878e25f05ab199349df942ec2de29b33605f68f1',
                                   '0d9949c8b09d4619d89c6cf3e72f1b568b3f2515d0a858286150400261309e5e',
                                   'e10e59a5fed6b375490de837b527862deb18c25470bde14c201f91e8a2122043',
                                   'ba14a0a413f392c1d87deb623f488b3c10fa0369e4f58849875f4b4a01b7f549']},
 'tha-ap31': {'raw_sha256': '94da44634640ca95e59d99d4382d0e0fd8d9f2f0b97e5ca03f0f083ad62b3f4b',
              'body_sha256': '18a5d9e5a6d11cbfbe30fb284127f44446c66b27ce0190fbdf9beed3a7f34071',
              'notes_sha256': '62cbc24f3d94ad5643d9a1bf28dd8638717a3ad98021dfb1feb296d1899ee2cd',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'e6c6033872e5dac3e129d822d4ae9cb06d669b042b2796218e7d77991ea0a80c',
              'notes': [1, 2, 3],
              'layout': [{'local_label': '1-2', 'publisher_label': '994-995', 'suffix': '(1-2) [994-995]', 'lines': 8},
                         {'local_label': '3', 'publisher_label': '996', 'suffix': '(3) [996]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '997', 'suffix': '(4) [997]', 'lines': 4}],
              'paragraph_hashes': ['1513d261d311ac9e1a5c656676a243bc52358828b949fc3b2837fb259d0ec26b',
                                   'aabefd5fe551f51324ce4ff901727b68690236276ae62b52b02566cd4c128e99',
                                   'fdfadcfd2f4895d0924ea821de95d811d29d38bc0167c0f47b5608641409ed85',
                                   'd99e49488c9448349339ac05cdcd7a5ebe95e5ebf548d0b9b2cf50f39b9289b8',
                                   '2cf45ce574ad821d8eef8af95c88656926b72f87f5da5f159c9d1195ce3d504f',
                                   '4a320a9cf52519557f9d17a3f4b562c1a00ecd41d5cd30165aff0cca5ef49a94']},
 'tha-ap32': {'raw_sha256': '4dc75c2815cad3065156a9a5d2fc939c3d8f1f5b564bd7404ea07893f535f87f',
              'body_sha256': '5d2719e9ecfc56b371b51b2ea866414aa482cc006df11d610d0ca3f3b61192d2',
              'notes_sha256': '230e92f2e8eff832e7250a37ac3179cd54857038ae701f538f79c68a59856b50',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '880208c7edc07e19ecef2141e65457c9283da68d91d724f89dd69512060bf232',
              'notes': [1, 2, 3],
              'layout': [{'local_label': '1', 'publisher_label': '998', 'suffix': '(1) [998]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '999', 'suffix': '(2) [999]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1000', 'suffix': '(3) [1000]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1001', 'suffix': '(4) [1001]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1002', 'suffix': '(5) [1002]', 'lines': 4}],
              'paragraph_hashes': ['325c471a89522292902453ecb3c2bd7ca7bb8f665be81e91a391664b86a2fd6c',
                                   'f70d74734e1fe7726d2331a67468cb3f7ffc04ad578a93f40608ccfb48ae67ab',
                                   '9967aae58111c567f81434b4fff45cf35f8b8a240baa8e96ef08e34cf5efd554',
                                   'b62f87d725e867464862e10d784c9e570298e5885b35ad8557aa87b56e76b256',
                                   '6b1fcef7706333a1490a23e5715866c1b99e138d67cab1df5456c56b7eba1800',
                                   '1b957efcfcd2267656dd4414d66295fc1ebf7a63eacb03d97be20b83cd8b746d',
                                   '6e8275e9a0b9c94df80df369228a740a2714a10ea6be3cfe6216f5062217138b',
                                   '02f202bb76d4a290d0031e30c5314630608c3e259acdb8fbb7a6769a362ed9cc']}}
SUMMARIES = {'tha-ap22': {'kind': 'canonical_chapter_summary',
              'label': 'Second Therā Apadāna chapter summary',
              'parent_id': 'tha-ap22',
              'first_ref': 'tha-ap22/21',
              'last_ref': 'tha-ap22/24',
              'root_start': 2501,
              'root_end': 2507,
              'root_sha256': '35f075b2f7a43ec8b4e5d725748cacee7d4daf694e5d20d9ec39f4ade16720f6',
              'body_sha256': 'efe5cafea6883a795ddecb45456307ba7e44e2945e05a21fa4b3f71dbb9d0725',
              'notes_sha256': '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
              'note_numbers': []},
 'tha-ap32': {'kind': 'canonical_chapter_summary',
              'label': 'Third Therā Apadāna chapter summary',
              'parent_id': 'tha-ap32',
              'first_ref': 'tha-ap32/9',
              'last_ref': 'tha-ap32/12',
              'root_start': 3107,
              'root_end': 3113,
              'root_sha256': 'a83f519af75303c25988447f1516001f63766061d0efc3144d7aee6c39900c5a',
              'body_sha256': '424d86b44f21a1fc0180324a823073889058089c45e9ab576e3c07e51d4e9542',
              'notes_sha256': '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
              'note_numbers': []}}
DIVISIONS = {'tha-ap19': [{'kind': 'publisher_recitation',
               'label': 'Third recitation portion',
               'parent_id': 'tha-ap19',
               'placement': 'after_poem',
               'body_sha256': '43cacf0087663f13678c2e80170cacf3a15aab1ab6656924cdcd962e546bdb93',
               'notes_sha256': '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
               'note_numbers': []}],
 'tha-ap32': [{'kind': 'publisher_recitation',
               'label': 'Fourth recitation portion',
               'parent_id': 'tha-ap32',
               'placement': 'after_chapter_summary',
               'body_sha256': '5de17edabbb0f71033e92fb3dbba9e302b8e986cd659484d857e4f1b7dcdfab4',
               'notes_sha256': '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
               'note_numbers': []}]}
ROUTING = {'path': 'src/_poems/chapter-3/chapter-3.json',
 'sha256': '50b6544f4689f2fcbd9287a86890cdcd6993c62b94ebcfb2d5419546f9ded2e0'}

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def compact(value, sort=False):
    return json.dumps(value, ensure_ascii=False, sort_keys=sort, separators=(',', ':'))


def profile(page):
    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)


def loaded(page):
    page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')


def saved(page, base):
    page.goto(base + '/#saved')
    page.get_by_role('heading', name='Saved passages', exact=True).wait_for()
    loaded(page)
    page.get_by_label('Search saved passages and notes',exact=True).fill('')


def bookmark_link(page, item):
    page.get_by_label('Search saved passages and notes',exact=True).fill(item['title'])
    return page.get_by_role('region', name='Saved passage results').get_by_role(
        'link', name=item['title'] + ' · ' + item['ref'], exact=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True, type=Path,
                        help='Official Git checkout at the exact manifest publisher revision')
    parser.add_argument('--server-dir', type=Path, help='Server directory from an extracted npm package')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--a11y', action='store_true', help='Labelled test-only CSP bypass for axe injection')
    modes.add_argument('--mcp-only', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
    manifest = json.loads((server_dir / 'data/apadana.json').read_text())
    assert manifest == json.loads((ROOT / 'server/data/apadana.json').read_text()), 'Package metadata differs'
    combined_rows,commit=manifest['links'],manifest['source']['commit']
    assert set(combined_rows) == {'thi-ap' + str(n) for n in range(1, 41)} | {'tha-ap' + str(n) for n in range(13, 43)} | {'tha-ap43', 'tha-ap45', 'tha-ap46', 'tha-ap47', 'tha-ap48', 'tha-ap49', 'tha-ap50', 'tha-ap51', 'tha-ap52', 'tha-ap53', 'tha-ap54', 'tha-ap55', 'tha-ap56', 'tha-ap57', 'tha-ap58', 'tha-ap59', 'tha-ap60', 'tha-ap61', 'tha-ap62'}, 'Unexpected combined publisher-source scope'
    # This historical suite retains exactly the original forty Therī and twenty Therā fixtures.
    historical_ids = set(BASELINE) | set(NEW_IDS)
    rows = {uid: row for uid, row in combined_rows.items() if uid in historical_ids}
    assert len(EXPECTED) == 20 and len(SUMMARIES) == 2 and len(DIVISIONS) == 2
    assert commit == SOURCE_REVISION, 'Publisher revision changed'
    assert set(rows) == set(BASELINE) | set(NEW_IDS), 'Unexpected activated source scope'
    assert len(BASELINE) == 40
    for uid, expected in BASELINE.items():
        assert digest(compact(rows[uid], sort=True)) == expected, uid + ': previous metadata changed'
        assert digest(compact({k:v for k,v in rows[uid].items() if k not in ('english','match')}, sort=True)) == BASELINE_PROFILES[uid], uid + ': previous profile changed'
    for uid in NEW_IDS:
        for key in PINS:
            assert rows[uid][key] == EXPECTED[uid][key], uid + ': independent source receipt differs: ' + key
        assert rows[uid]['note_count'] == len(EXPECTED[uid]['notes'])
    for uid in NEW_IDS:
        assert rows[uid]['poem'] == MAPPING[uid] and rows[uid]['publisher_chapter'] == 'chapter-3'
        assert rows[uid]['path'] == '/text/chapter-3/poem-' + str(MAPPING[uid]).zfill(3) + '/'
        assert rows[uid].get('chapter_summary') == SUMMARIES.get(uid)
        assert rows[uid].get('publisher_divisions') == DIVISIONS.get(uid)
        assert all(name not in rows[uid] for name in ('collection_summary','publisher_preface'))
    checkout = args.source_root.resolve()
    assert subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip() == commit
    assert len(manifest['source']['rights_artifacts']) == 6
    assert {a['path']: a['sha256'] for a in manifest['source']['rights_artifacts']} == RIGHTS, 'Independent rights pins changed'
    for artifact in manifest['source']['rights_artifacts']:
        assert hashlib.sha256((checkout / artifact['path']).read_bytes()).hexdigest() == artifact['sha256']
    assert hashlib.sha256((checkout / ROUTING['path']).read_bytes()).hexdigest() == ROUTING['sha256']
    files = {}
    for row in rows.values():
        relative = row['raw_url'].split(commit + '/', 1)[1]
        local = (checkout / relative).resolve()
        assert local.is_relative_to(checkout), 'Source path escaped official checkout'
        assert hashlib.sha256(local.read_bytes()).hexdigest() == row['raw_sha256']
        files[row['raw_url']] = str(local)

    def version(uid):
        return 'ap:' + rows[uid]['path'].removeprefix('/text/').rstrip('/')

    with TemporaryDirectory(prefix='pali-apadana-thera-') as work:
        stage, checks, scans, receipts = Path(work), [], [], []
        ledger, preload = stage / 'fetches.jsonl', stage / 'provider.cjs'
        preload.write_text(
            "const fs=require('node:fs'),files=" + json.dumps(files)
            + ";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);"
            + "const ok=Object.hasOwn(files,url);fs.appendFileSync(" + json.dumps(str(ledger))
            + ",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');"
            + "return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        server = subprocess.Popen(['node', '--require', str(preload), str(server_dir / 'http.cjs')], cwd=stage,
                                  env={**os.environ, 'HOST': '127.0.0.1', 'PORT': str(port), 'RATE_LIMIT_PER_MINUTE': '0'},
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        def rpc(name, arguments):
            body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
                               'params': {'name': name, 'arguments': arguments}}).encode()
            req = urllib.request.Request(base + '/mcp', data=body,
                                         headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
            with urllib.request.urlopen(req, timeout=90) as response:
                return json.load(response)['result']

        def tool(name, arguments):
            result = rpc(name, arguments)
            assert not result.get('isError'), name + ': unexpected MCP error'
            return result['structuredContent']

        def check_source(data, uid):
            row = rows[uid]
            assert data['text_id'] == uid and data['translation_id'] == version(uid)
            assert data['translation_revision'] == commit and data['url'] == row['url']
            assert data['fetched_url'] == row['raw_url']
            assert 'translation_scope' not in data and data.get('whole_unit_coverage') is not False
            assert data['license'] == 'CC BY-NC-SA 4.0' and data['license_url'] == LICENSE_URL
            assert 'Walters' in data['attribution'] and 'Whitman College' in data['attribution'] and data['changes']
            assert all(data[key] == row[key] for key in PINS)
            assert data['mapping_notes'] == row['mapping_notes'] and row['mapping_notes']
            assert all(note in data['notes'] for note in row['mapping_notes'])
            assert [note['number'] for note in data['translator_notes']] == EXPECTED[uid]['notes']
            assert digest(compact(data['translator_notes'])) == row['notes_sha256']
            assert digest(data['publisher_paratext']) == row['paratext_sha256']
            assert bool(data['publisher_paratext']) == (uid in ('tha-ap13','tha-ap23'))
            assert all(name not in data for name in ('publisher_preface','collection_summary'))
            if uid in SUMMARIES:
                scope, contract = data['chapter_summary'], SUMMARIES[uid]
                assert set(scope) == set(contract) | {'text','translator_notes'}
                assert all(scope[key] == value for key,value in contract.items())
                assert digest(scope['text']) == contract['body_sha256']
                assert scope['translator_notes'] == []
            else:
                assert 'chapter_summary' not in data
            if uid in DIVISIONS:
                assert len(data['publisher_divisions']) == 1
                scope,contract=data['publisher_divisions'][0],DIVISIONS[uid][0]
                assert set(scope) == set(contract) | {'text','translator_notes'}
                assert all(scope[key] == value for key,value in contract.items())
                assert digest(scope['text']) == contract['body_sha256'] and scope['translator_notes'] == []
                assert scope['text'] not in data['text']
            else:
                assert 'publisher_divisions' not in data

        def check_whole(data, uid):
            check_source(data, uid)
            assert digest(data['text']) == rows[uid]['body_sha256']
            paragraphs = data['text'].split('\n\n')
            assert [digest(p) for p in paragraphs] == EXPECTED[uid]['paragraph_hashes'], uid + ': paragraph wording/boundary drift'
            # The independent stanza layout is ordered physical publisher entries, not inferred VRI alignment.
            for paragraph, stanza in zip(paragraphs[1:-2], EXPECTED[uid]['layout'], strict=True):
                assert re.sub(r'\[Note \d+\]', '', paragraph).strip().endswith(stanza['suffix']), uid + ': publisher label drift'
                assert len(paragraph.splitlines()) == stanza['lines'], uid + ': publisher paragraph break drift'

        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen(base + '/healthz', timeout=1).close()
                    break
                except OSError:
                    time.sleep(.1)
            else:
                raise AssertionError('Actual packaged HTTP bundle did not start')
            metadata = {uid: tool('get_text', {'uid': uid, 'limit': 200}) for uid in rows}
            assert not ledger.exists(), 'Metadata automatically retrieved English'
            for uid, meta in metadata.items():
                if uid in BASELINE_ROOT_SEGMENTS:
                    assert digest(compact([{'ref': seg['ref'], 'type': seg['type'], 'text': seg['text']} for seg in meta['segments']])) == BASELINE_ROOT_SEGMENTS[uid], uid + ': previous Pāli segments changed'
                assert len(meta['english_available']) == 1
                choice = meta['english_available'][0]
                assert choice['translation_id'] == version(uid) and choice['translation_revision'] == commit
                assert choice['license'] == 'CC BY-NC-SA 4.0' and choice['url'] == rows[uid]['url']
                if uid in NEW_IDS:
                    assert choice.get('chapter_summary') == SUMMARIES.get(uid)
                    assert choice.get('publisher_divisions') == DIVISIONS.get(uid)
                    assert choice.get('publisher_preface') is None and choice.get('collection_summary') is None
                if uid in LEGACY_LAST:
                    assert meta['source']['locator_revision'] == manifest['vri_commit'] + '-apadana-thera11-30-v1'
            assert len(BASELINE_ROOT_SEGMENTS) == 40
            commentary = tool('get_commentary', {'uid':'tha-ap19','limit':200})
            assert commentary['source']['commit'] == manifest['vri_commit']
            assert commentary['source']['locator_revision'] == COMMENTARY_REVISION
            assert [seg['ref'] for seg in commentary['segments']] == ['tha-ap19/c'+str(n) for n in range(1,8)]
            unaffected = tool('get_commentary', {'uid':'tha-ap20','limit':200})
            assert 'locator_revision' not in unaffected['source']
            assert unaffected['available'] and unaffected['total_segments']==36
            assert [p['comments_on']['vri_paragraphs'] for p in unaffected['passages']]==['97–98','99','100','101']
            assert tool('get_commentary', {'uid':'sn12.21','limit':1})['source']['locator_revision'] == manifest['vri_commit'] + '-sn21-commentary-5d4a1ce27e404e2952cf4dcc'
            for uid in NEW_IDS:
                foreign = 'thi-ap' + str(MAPPING[uid])
                for request in ({'uid': uid, 'translation': version(foreign)},
                                {'uid': uid, 'translation': version(uid), 'translation_revision': '0' * 40},
                                {'uid': uid, 'translation': version(uid), 'offset': 1, 'prefix_sha256': '0' * 64}):
                    assert rpc('get_translation', request).get('isError'), 'Unsafe owner/revision request accepted'
            assert not ledger.exists(), 'Invalid source identity fetched publisher bytes'
            checks.append({'check': 'All60 choices explicit; old40 profiles/manifest/Pāli frozen; explicit Therā mapping and four root revisions; corrected19commentary7segments/newpin; unrelatedcommentary unchanged; cross-family owners/revisions/prefixes refuse before fetch'})
            whole = {}
            for uid in NEW_IDS:
                request = {'uid': uid, 'translation': version(uid), 'translation_revision': commit, 'limit': 500}
                pieces, initial = [], None
                while request:
                    data = tool('get_translation', request)
                    check_source(data, uid)
                    initial = initial or data
                    prefix = ''.join(pieces)
                    assert data['offset'] == len(prefix) and len(pieces) < 150
                    pieces.append(data['text'])
                    continuation = data['continue_with']
                    request = continuation['arguments'] if continuation else None
                    if request:
                        assert request['uid'] == uid and request['translation'] == version(uid)
                        assert request['translation_revision'] == commit and request['offset'] == data['next_offset']
                        assert request['prefix_sha256'] == digest(''.join(pieces))
                        assert rpc('get_translation', {**request, 'prefix_sha256': '0' * 64}).get('isError')
                        assert rpc('get_translation', {**request, 'translation_revision': '0' * 40}).get('isError')
                assert len(pieces) >= 1
                whole[uid] = {**initial, 'text': ''.join(pieces), 'continue_with': None}
                check_whole(whole[uid], uid)
                checks.append({'check': uid + ': exact independently pinned poem/notes/preface/paratext; 500-character continuation', 'pages': len(pieces)})
                receipts.append({'uid': uid, 'transport': 'mcp', 'characters': len(whole[uid]['text']),
                                 'stanzas': len(EXPECTED[uid]['layout']), 'note_count': len(EXPECTED[uid]['notes']),
                                 **{key: rows[uid][key] for key in PINS}})
            for uid in NEW_IDS:
                paragraphs = whole[uid]['text'].split('\n\n')
                selections = range(1, len(EXPECTED[uid]['layout']) + 1)
                for index in sorted(selections):
                    stanza = re.sub(r'\[Note \d+\]', '', paragraphs[index]).strip()
                    suffix = EXPECTED[uid]['layout'][index - 1]['suffix']
                    assert stanza.endswith(suffix)
                    quote = stanza[:-len(suffix)].strip()
                    result = tool('verify_quote', {'text': quote, 'language': 'english', 'texts': [uid], 'translation_ids': [version(uid)]})
                    assert result['verdict'] == 'found' and result['best_similarity'] == 1, uid + ': exact stanza quotation missing'
                    assert result['scope']['translations_checked'][0]['translation_revision'] == commit
            excluded = [(uid,'publisher preface',whole[uid]['publisher_paratext']) for uid in ('tha-ap13','tha-ap23')]
            for uid in NEW_IDS:
                excluded.append((uid,'publisher title',whole[uid]['text'].split('\n\n')[0]))
                excluded.extend((uid,'publisher colophon',part) for part in whole[uid]['text'].split('\n\n')[-2:])
                excluded.extend((uid,'translator note '+str(n['number']),n['text']) for n in whole[uid]['translator_notes'])
            excluded.extend((uid,'chapter summary',whole[uid]['chapter_summary']['text'].split('\n\n')[1]) for uid in SUMMARIES)
            excluded.extend((uid,'recitation divider',whole[uid]['publisher_divisions'][0]['text']) for uid in DIVISIONS)
            guarded_exclusions, short_editorial_controls = [], []
            for uid, label, quote in excluded:
                if len(quote)<8 or len(quote)>2000 or len(re.findall(r'[^\W\d_]+',quote,re.UNICODE))>120:
                    assert rpc('verify_quote',{'text':quote,'language':'english','texts':[uid],'translation_ids':[version(uid)]}).get('isError')
                    guarded_exclusions.append({'uid':uid,'check':label,'characters':len(quote)})
                    continue
                if label.startswith('translator note ') and len(re.findall(r'[^\W\d_]+',quote,re.UNICODE))<12:
                    # Short glosses can be legitimate semantic matches to poem words; they do not distinguish ownership.
                    # Every complete note is separately verified by independent exact definition hashes above.
                    short_editorial_controls.append({'uid':uid,'check':label,'characters':len(quote)})
                    continue
                result = tool('verify_quote', {'text': quote, 'language': 'english', 'texts': [uid], 'translation_ids': [version(uid)]})
                assert result['verdict'] == 'not_found_in_scope', label + ': editorial/summary wording misowned as poem'
            checks.append({'check': 'All327 printed stanzas are exact quotation positives; distinct editorial titles/prefaces/long notes/colophons/summaries/recitation endings excluded; all153note hashes separately verified; short note query limits explicit'})
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            old = [{'uid':uid,'title':'Authentic old root '+uid+'/'+str(ref),'ref':uid+'/'+str(ref),'offset':ref-1,
                                    'source_commit':manifest['vri_commit'],'note':PRIVATE+' saved root '+uid+'/'+str(ref)}
                                   for uid in LEGACY_LAST for ref in (1,LEGACY_LAST[uid])]
                            old += [{'uid':'commentary-ref:tha-ap19','title':'Authentic old aligned tha-ap19/c'+str(n),
                                     'ref':'tha-ap19/c'+str(n),'offset':n-1,'source_commit':manifest['vri_commit'],'note':PRIVATE+' saved commentary '+str(n)}
                                    for n in (1,*range(8,40))]
                            raw = compact({'theme': theme, 'remember_position': False, 'saved': old, 'reading_progress': []})
                            context.add_init_script(f'if(!localStorage.getItem({json.dumps(KEY)}))localStorage.setItem({json.dumps(KEY)},{json.dumps(raw)})')
                            page, errors, forbidden, requests = context.new_page(), [], [], []
                            page.set_default_timeout(15000)
                            state = {'drift': None}
                            page.on('pageerror', lambda error: errors.append(type(error).__name__))

                            def intercept(route):
                                req = route.request
                                if (not req.url.startswith(base + '/') or PRIVATE_MARKER in req.url or PRIVATE_MARKER in (req.post_data or '')
                                        or any(PRIVATE_MARKER in value for value in req.headers.values())):
                                    forbidden.append('external request or private data')
                                    route.abort()
                                    return
                                if req.method == 'POST' and req.url.endswith('/mcp'):
                                    command = req.post_data_json['params']
                                    if command['name'] == 'get_translation':
                                        requests.append(command['arguments'])
                                        if state['drift']:
                                            response = route.fetch()
                                            content = response.json()
                                            content['result']['structuredContent'].update(state['drift'])
                                            route.fulfill(response=response, json=content)
                                            return
                                route.continue_()

                            context.route('**/*', intercept)
                            page.on('dialog', lambda dialog: dialog.accept())

                            def audit(label):
                                assert not errors and not forbidden, 'Page error or forbidden/private traffic'
                                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
                                assert PRIVATE_MARKER not in page.title()
                                assert profile(page)['saved'][:len(old)] == old, 'Original saved notes or source pins changed'
                                if args.a11y:
                                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                                    result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                                    scans.append({'width': width, 'theme': theme, 'state': label,
                                                  'violations': [item['id'] for item in result['violations']]})

                            def choose(uid):
                                prior = len(requests)
                                read_tool(page, 'English sources').click()
                                card = page.locator('#study .translation-choice').filter(has_text=rows[uid]['reference'])
                                expect(card).to_have_count(1)
                                assert len(requests) == prior, 'English fetched without explicit selection'
                                card.get_by_role('button').filter(has_text='Read source ·').focus()
                                page.keyboard.press('Enter')

                            saved(page, base)
                            page.get_by_label('Your personal note', exact=True).first.fill(PRIVATE + ' unsaved')
                            for uid in NEW_IDS:
                                prior = len(requests)
                                page.goto(base + '/#read?uid=' + uid)
                                read_tool(page, 'English sources').wait_for()
                                assert len(requests) == prior
                                choose(uid)
                                body = page.locator('#study > .translation')
                                body.wait_for()
                                combined, part_count = [], 0
                                while True:
                                    part_count += 1
                                    assert part_count < 20
                                    combined.append(body.text_content())
                                    notices = page.locator('#study > .notice').all_text_contents()
                                    assert all(any(note in notice for notice in notices) for note in rows[uid]['mapping_notes'])
                                    provenance = page.locator('#study > .provenance')
                                    assert all(value in provenance.text_content() for value in (commit, 'CC BY-NC-SA 4.0', 'Walters', 'Whitman College'))
                                    assert set(provenance.locator('a').evaluate_all('links=>links.map(link=>link.href)')) == {rows[uid]['url'], LICENSE_URL}
                                    notes = page.get_by_role('region',name='Translator’s notes',exact=True)
                                    if EXPECTED[uid]['notes']:
                                        expect(notes).to_have_count(1)
                                        assert [item.get_attribute('value') for item in notes.locator('li').all()] == [str(n) for n in EXPECTED[uid]['notes']]
                                        assert digest(compact([{'number':int(item.get_attribute('value')),'text':item.locator('p').text_content()} for item in notes.locator('li').all()])) == rows[uid]['notes_sha256']
                                    else:
                                        expect(notes).to_have_count(0)
                                    preface = page.get_by_role('heading',name='Publisher preface · editorial, not poem text',exact=True)
                                    assert preface.count() == int(uid in ('tha-ap13','tha-ap23'))
                                    if preface.count():
                                        assert digest(preface.locator('..').locator('.translation').text_content()) == rows[uid]['paratext_sha256']
                                    expect(page.get_by_role('heading',name='Preface notes · editorial, not poem notes',exact=True)).to_have_count(0)
                                    summary=page.get_by_role('region',name='Canonical chapter summary · not poem text',exact=True)
                                    if uid in SUMMARIES:
                                        expect(summary).to_have_count(1)
                                        assert digest(summary.locator('.translation').text_content()) == SUMMARIES[uid]['body_sha256']
                                        assert summary.locator('li').count() == 0
                                        expect(summary.get_by_role('heading',name='Chapter summary notes · editorial, not poem notes',exact=True)).to_have_count(0)
                                    else:
                                        expect(summary).to_have_count(0)
                                    expect(page.get_by_role('region',name='Canonical collection summary · not poem text',exact=True)).to_have_count(0)
                                    divisions=page.get_by_role('region',name='Publisher recitation division · not poem text',exact=True)
                                    if uid in DIVISIONS:
                                        expect(divisions).to_have_count(1)
                                        assert digest(divisions.locator('.translation').text_content()) == DIVISIONS[uid][0]['body_sha256']
                                        assert divisions.locator('li').count() == 0
                                        expect(divisions.get_by_role('heading',name='Recitation notes · editorial, not poem notes',exact=True)).to_have_count(0)
                                        caption='after the poem’s closing colophons' if uid=='tha-ap19' else 'after the chapter summary'
                                        assert caption in divisions.inner_text()
                                    else:
                                        expect(divisions).to_have_count(0)
                                    audit(uid + ': page ' + str(part_count))
                                    next_page = page.get_by_role('button', name='Next English page →', exact=True)
                                    if not next_page.count():
                                        break
                                    last = body.text_content()
                                    next_page.focus()
                                    page.keyboard.press('Enter')
                                    expect(body).not_to_have_text(last)
                                assert digest(''.join(combined)) == rows[uid]['body_sha256']
                                assert requests[-1]['uid'] == uid and requests[-1]['translation_revision'] == commit
                                if len(whole[uid]['text']) > 6000:
                                    assert part_count > 1 and requests[-1]['prefix_sha256'] == digest(''.join(combined[:-1]))
                            for uid,label,patch in (
                                    ('tha-ap32','revision',{'translation_revision':'0'*40}),
                                    ('tha-ap32','cross-family owner',{'text_id':'thi-ap32'}),
                                    ('tha-ap32','raw source',{'raw_sha256':'0'*64}),
                                    ('tha-ap32','terms',{'license':'CC BY 4.0'}),
                                    ('tha-ap32','missing summary',{'chapter_summary':None}),
                                    ('tha-ap32','summary owner',{'chapter_summary':{**whole['tha-ap32']['chapter_summary'],'parent_id':'thi-ap32'}}),
                                    ('tha-ap32','summary root',{'chapter_summary':{**whole['tha-ap32']['chapter_summary'],'root_sha256':'0'*64}}),
                                    ('tha-ap32','invented summary notes',{'chapter_summary':{**whole['tha-ap32']['chapter_summary'],'translator_notes':whole['tha-ap32']['translator_notes']}}),
                                    ('tha-ap32','missing recitation',{'publisher_divisions':None}),
                                    ('tha-ap32','recitation owner',{'publisher_divisions':[{**whole['tha-ap32']['publisher_divisions'][0],'parent_id':'thi-ap32'}]}),
                                    ('tha-ap32','recitation placement',{'publisher_divisions':[{**whole['tha-ap32']['publisher_divisions'][0],'placement':'after_poem'}]}),
                                    ('tha-ap32','recitation notes',{'publisher_divisions':[{**whole['tha-ap32']['publisher_divisions'][0],'translator_notes':whole['tha-ap32']['translator_notes']}]}),
                                    ('tha-ap19','recitation placement',{'publisher_divisions':[{**whole['tha-ap19']['publisher_divisions'][0],'placement':'after_chapter_summary'}]}),
                                    ('tha-ap30','invented Uttiya notes',{'translator_notes':whole['tha-ap31']['translator_notes']}),
                                    ('tha-ap13','foreign scoped preface',{'publisher_preface':{**rows['thi-ap31']['publisher_preface'],'translator_notes':[]}}),
                                    ('tha-ap32','foreign collection scope',{'collection_summary':{**rows['thi-ap40']['collection_summary'],'text':whole['tha-ap32']['chapter_summary']['text'],'translator_notes':[]}})):
                                page.goto(base+'/#read?uid='+uid)
                                state['drift']=patch
                                choose(uid)
                                expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible()
                                expect(page.locator('#study .translation')).to_have_count(0)
                                audit('refused '+label)
                            state['drift'] = None
                            for item in old:
                                saved(page, base)
                                bookmark_link(page, item).focus()
                                page.keyboard.press('Enter')
                                page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                assert page.locator('.passage').count() == 0
                                assert 'source or citation mapping revision changed' in page.locator('#view').inner_text()
                                assert PRIVATE_MARKER not in page.locator('#view').inner_text()
                                if not item['uid'].startswith('commentary-ref:') or item['ref'] in ('tha-ap19/c1','tha-ap19/c8','tha-ap19/c39'):
                                    audit('authentic pre-repair refusal '+item['ref'])
                                review = page.get_by_role('link', name='Review current source at this reference', exact=True)
                                review.focus()
                                page.keyboard.press('Enter')
                                if item['ref'] in ('tha-ap19/18','tha-ap23/59') or item['uid'].startswith('commentary-ref:') and item['offset']>=7:
                                    page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                    assert page.locator('.passage').count() == 0
                                else:
                                    page.locator('.passage').first.wait_for()
                                    loaded(page)
                                    assert page.locator('.segment-label a').first.inner_text() == item['ref']
                                    assert 'source=' not in page.url
                                if not item['uid'].startswith('commentary-ref:') or item['ref'] in ('tha-ap19/c1','tha-ap19/c8','tha-ap19/c39'):
                                    audit('explicit current review '+item['ref'])
                            saved(page, base)
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            page.reload()
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            with page.expect_download() as download:
                                page.get_by_role('button', name='Export bookmarks and notes', exact=True).click()
                            exported = json.loads(Path(download.value.path()).read_text())
                            assert exported['saved'] == [{**old[0], 'note': PRIVATE + ' unsaved'}, *old[1:]]
                            assert profile(page)['saved'] == old
                            audit('draft recovery/export preserve saved versions')
                            for fresh_uid in ('tha-ap20','tha-ap24'):
                                page.goto(base + '/#read?uid=' + fresh_uid)
                                segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                                segment.wait_for()
                                segment.get_by_role('button', name='Save passage '+fresh_uid+'/2', exact=True).click()
                                fresh = profile(page)['saved'][-1]
                                assert fresh['ref'] == fresh_uid+'/2' and fresh['offset'] == 1
                                assert fresh['source_commit'] == manifest['vri_commit'] + '-apadana-thera11-30-v1'
                                saved(page, base)
                                bookmark_link(page, fresh).focus()
                                page.keyboard.press('Enter')
                                page.locator('.passage').first.wait_for()
                                loaded(page)
                                assert page.locator('.segment-label a').first.inner_text() == fresh['ref']
                                assert page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text() == metadata[fresh_uid]['segments'][1]['text']
                                audit('fresh revision-pinned bookmark roundtrip ' + fresh_uid)
                            page.goto(base+'/#read?kind=commentary&uid=tha-ap19&offset=1')
                            segment=page.locator('section[aria-label="Pāli passage"] .segment').first
                            segment.wait_for()
                            segment.get_by_role('button',name='Save passage tha-ap19/c2',exact=True).click()
                            fresh=profile(page)['saved'][-1]
                            assert fresh['uid']=='commentary-ref:tha-ap19' and fresh['ref']=='tha-ap19/c2' and fresh['source_commit']==COMMENTARY_REVISION
                            saved(page,base);bookmark_link(page,fresh).click()
                            page.locator('.passage').first.wait_for();loaded(page)
                            assert page.locator('.segment-label a').first.inner_text()=='tha-ap19/c2'
                            assert page.locator('.passage').first.inner_text()==commentary['segments'][1]['text']
                            audit('fresh revised aligned commentary')
                            checks.append({'width':width,'theme':theme,'check':'All20 explicit Therā sources; exact wording/notes; note-free summaries/prefaces/ending divisions;16drift refusals;4oldrootowners+33oldalignedcommentarylocators incl all vanishedc8–39;localdraft/export;fresh20/24rootand19commentary'})
                            context.close()
                    browser.close()
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(event['ok'] for event in events)
            assert {event['url'] for event in events} == {rows[uid]['raw_url'] for uid in NEW_IDS}
            report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'publisher_revision': commit,
                      'previous_metadata_baseline': 'a29607d', 'previous_metadata_preserved': len(BASELINE), 'previous_pali_roots_preserved': len(BASELINE_ROOT_SEGMENTS),
                      'chapter_summaries':SUMMARIES,'publisher_divisions':DIVISIONS,'publisher_routing':ROUTING,'aligned_commentary_revision':COMMENTARY_REVISION,'bounded_quote_exclusions_refused':guarded_exclusions,'short_note_query_limits':short_editorial_controls,
                      'outside_source_tree': bool(args.server_dir), 'browser_mode': 'not run' if args.mcp_only else 'chromium',
                      'csp_bypass': 'test-only axe contexts' if args.a11y else 'none',
                      'pinned_provider_reads': len(events), 'upstream_provider_requests': 0,
                      'a11y': {'scans': len(scans), 'violations': sum(len(scan['violations']) for scan in scans), 'results': scans},
                      'limits': 'Actual packaged MCP and emulated Chromium viewports with exact official local publisher bytes at provider transport. No live publisher availability, new rights or specialist approval, physical-device or human assistive acceptance. Reports contain metadata/hashes only, no publisher bodies, translator notes or private drafts.'}
            rendered = json.dumps(report, indent=2)
            if args.report:
                args.report.parent.mkdir(parents=True, exist_ok=True)
                args.report.write_text(rendered + '\n')
            print(rendered)
            assert report['a11y']['violations'] == 0
        finally:
            server.terminate()
            server.wait(timeout=10)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Playwright assertion messages may contain actual publisher wording or private drafts.
        # Keep failed-run logs metadata-only; the final harness frame identifies the check.
        frames = [frame for frame in traceback.extract_tb(error.__traceback__) if frame.filename == __file__]
        frame = frames[-1] if frames else None
        trace, context = error.__traceback__, {}
        while trace:
            if trace.tb_frame.f_code.co_filename == __file__:
                scope = trace.tb_frame.f_locals
                if re.fullmatch(r'(?:thi|tha)-ap\d+', str(scope.get('uid', ''))): context['uid'] = scope['uid']
                if isinstance(scope.get('index'), int): context['paragraph_index'] = scope['index']
                if isinstance(scope.get('item'),dict) and re.fullmatch(r'(?:thi|tha)-ap\d+/(?:c)?\d+',str(scope['item'].get('ref',''))): context['saved_reference']=scope['item']['ref']
                if isinstance(scope.get('label'),str) and re.fullmatch(r'[A-Za-z0-9 -]{1,60}',scope['label']): context['check_label']=scope['label']
                if scope.get('name')=='verify_quote' and isinstance(scope.get('arguments'),dict):
                    context['query_characters']=len(scope['arguments'].get('text',''))
                    context['query_words']=len(scope['arguments'].get('text','').split())
            trace = trace.tb_next
        print(json.dumps({'passed': False, 'error_type': type(error).__name__,
                          'failure_at': {'file': Path(__file__).name, 'line': frame.lineno if frame else None}, 'context': context,
                          'limits': 'Failure detail redacted to protect publisher wording, translator notes and private drafts.'}), file=sys.stderr)
        sys.exit(1)
