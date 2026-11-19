#!/usr/bin/env python3
"""Actual MCP/browser checks for the ten reviewed fourth-chapter Apadāna additions; pinned local bytes only."""
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
PRIVATE = 'PRIVATE_APADANA_FOURTH_ā😀'
PRIVATE_MARKER = 'PRIVATE_APADANA_FOURTH'
NEW_IDS = tuple("thi-ap" + str(n) for n in range(31, 41))
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
 'thi-ap30': '42762d786134277d92963151c49369100d8efbf5639361f63e653407439e8719'}
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
 'thi-ap30': '2493b9006ee353490e56c2b5072d03e8af170f0aac73e5af93f54f0cd5b503e5'}
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
 'thi-ap30': 'b3d585f4bc2b073d676d5058ff7e024d429e19a4d3ea25b5c65e6bd7e3830ca0'}
STABLE_NEIGHBORS = {'thi-ap31': {'pali': 'd67cc2fdcfbf346dce38fc2261264864c2a261635ceda8c08bc8080e62aaf5a6',
              'locator_revision': None},
 'thi-ap32': {'pali': '79d7752cfc1179819bba7f4434dd3d239d123f8b40dca4ebc96671d4f499f8a3',
              'locator_revision': None},
 'thi-ap38': {'pali': 'dc33f09b78408e7358828fc49eb70a61622582718e4f738e418863bd63d02df4',
              'locator_revision': None}}
LEGACY_LAST = {'thi-ap33': 30, 'thi-ap34': 32, 'thi-ap35': 34, 'thi-ap36': 30, 'thi-ap37': 17}
SOURCE_REVISION = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
RIGHTS = {'LICENSE.md': '66eea18fe8cb99e0d178d838a4932be0d3af8a6f844e933a8bbb0054e22f2592',
 'src/_pages/about.md': '17d8029419cd7b4c7f9e7f88d0127141d2425b3fe30516888b389ce7521f1352',
 'src/_includes/site/footer.njk': '08a7d4a0c3a9841afa38a8d98aa563e0ddedc6228f66e86b9a49d564aba26fd4',
 'src/_includes/layouts/epub-metadata.xml': '1a6320b1580b76112c63bd557e419d5816b410197da666444e9d412327430b2f',
 'src/_data/site.json': '6b4b5b5661b1bfb35cee0f207066fd6941aa042d6377993b02c77db677319efa',
 'src/_poems/_poems.json': '7c0d9a568ff9c495c89fb3ae13397ff71e8e1d678c221cca5966c9adc886cf22'}
PINS = ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256')
LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
# Independent official Git-object review GOLDENS; hashes/labels only, never publisher wording.
EXPECTED = {'thi-ap31': {'raw_sha256': '40aa1dd553e4af360814e0a6f221a270947edbd8eb8c26f1a890b100cd466b97',
              'body_sha256': '255849e89c259309602efe43bdf3773264758abfe8a20fc1d7112e51bb0ad4eb',
              'notes_sha256': '7ddd63964bb8f617061b981ebcb07e2e01342d1e1d844d597ca39ff33b8e0b1d',
              'paratext_sha256': 'a097c544435ed7c8df97c64b1c122b6f19fe516750647b8b79b15221f12a0237',
              'root_sha256': '30a3ccf318d0cd123c365f638f387325f3ea41588fe625b4c9a9c34b42e9cc90',
              'notes': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
              'layout': [{'local_label': '1', 'publisher_label': '1104', 'suffix': '(1) [1104]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1105', 'suffix': '(2) [1105]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1106', 'suffix': '(3) [1106]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1107', 'suffix': '(4) [1107]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1108', 'suffix': '(5) [1108]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1109', 'suffix': '(6) [1109]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1110', 'suffix': '(7) [1110]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1111', 'suffix': '(8) [1111]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1112', 'suffix': '(9) [1112]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1113', 'suffix': '(10) [1113]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1114', 'suffix': '(11) [1114]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1115', 'suffix': '(11) [1115]', 'lines': 4}],
              'paragraph_hashes': ['89f48ff5321f3017aa515d416dddeafff575fe6451e5cf353f41ed2504bdc2b9',
                                   'ee8944c6499020724cc629419c53d48b721cf69cd0e1605156422a46dc8f9ce1',
                                   '944f906862f3f2c3f2f0c1276e993424b3379bbcbf89a3a762b0d21a700a92f9',
                                   'ec731c8bfdc37eb2937953d91e0bf4d091207bffba723e07988e43e114d86ee4',
                                   '88a63a2868fd29eebe9f5a9171ad0b2b7bfdc9a41d180962da74d5a64dd4c3f8',
                                   '5676344856ff38b86928a5284acb271ca3e70638597ca8f93f5562125eabf8b5',
                                   'bc0de93461b245d77e069e56c6ea20aad604cc63915d299ce184988c3b399199',
                                   '0d705e0a0a9af1cabcec6e31b174096352b74274a0eaa4e0a08369ea14963d37',
                                   '319653a7c0e24b25301e349e1741315ad24745cc6035b96cf27b7e0dec677ff0',
                                   '0edb5ef0e0fcdae96601ea523aa729c6da7ecef8ccc5a5fea32a4db0b03eaba0',
                                   '3e0a6abb7059c1ee6ddbaccef0e0fa6a2b019d5cb8b40ecac672f3394b34578d',
                                   '7e16ddf3a4a7ef7dbb9922d86305047da2b1aa0afc172cd74291e6e9804dc57b',
                                   '80bb42c822a3687989ebc2dd3f65699824968c5617324a452e6af9106cb11b51',
                                   '0f6b6e13c7097697674a00703a0f1f2a9561d0a0feb754856c445df15982b31e',
                                   'b169c43456c218af2d44f6bb5be9a4f302c100afac9b0f8e28ac26a1ba1675d5']},
 'thi-ap32': {'raw_sha256': '3af7d1cabbdb5b2039c95673f3e956d9ac3dad7f58a2fe4261ac03e161a0032f',
              'body_sha256': '15844943813e231a9c896907556b9cb09395727d8bca5c7f2c3913cf4a870898',
              'notes_sha256': 'aa80265395d9c7844c91d40d2dd5b8e74722637f2790374dc6ce0acd90cb2b73',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '638544284bb12a3327e3aa0bbea963a4ebb51f508fe54d3fc34b20ef907a05b9',
              'notes': [1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12,
                        13,
                        14,
                        15,
                        16,
                        17,
                        18,
                        19,
                        20,
                        21,
                        22,
                        23,
                        24,
                        25,
                        26,
                        27,
                        28,
                        29,
                        30,
                        31,
                        32,
                        33,
                        34,
                        35,
                        36,
                        37,
                        38,
                        39,
                        40,
                        41,
                        42,
                        43,
                        44,
                        45,
                        46,
                        47,
                        48,
                        49],
              'layout': [{'local_label': '1', 'publisher_label': '1116', 'suffix': '(1) [1116]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1117', 'suffix': '(2) [1117]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1118', 'suffix': '(3) [1118]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1119', 'suffix': '(4) [1119]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1120', 'suffix': '(5) [1120]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1121', 'suffix': '(6) [1121]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1122', 'suffix': '(7) [1122]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1123', 'suffix': '(8) [1123]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1124', 'suffix': '(9) [1124]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1125', 'suffix': '(10) [1125]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1126', 'suffix': '(11) [1126]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1127', 'suffix': '(12) [1127]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1128', 'suffix': '(13) [1128]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1129', 'suffix': '(14) [1129]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1130', 'suffix': '(15) [1130]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1131', 'suffix': '(16) [1131]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1132', 'suffix': '(17) [1132]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1133', 'suffix': '(18) [1133]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1134', 'suffix': '(19) [1134]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1135', 'suffix': '(20) [1135]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '1136', 'suffix': '(21) [1136]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '1137', 'suffix': '(22) [1137]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '1138', 'suffix': '(23) [1138]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '1139', 'suffix': '(24) [1139]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '1140', 'suffix': '(25) [1140]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '1141', 'suffix': '(26) [1141]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '1142', 'suffix': '(27) [1142]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '1143', 'suffix': '(28) [1143]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '1144', 'suffix': '(29) [1144]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '1145', 'suffix': '(30) [1145]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '1146', 'suffix': '(31) [1146]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '1147', 'suffix': '(32) [1147]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '1148', 'suffix': '(33) [1148]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '1149', 'suffix': '(34) [1149]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '1150', 'suffix': '(35) [1150]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '1151', 'suffix': '(36) [1151]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '1152', 'suffix': '(37) [1152]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '1153', 'suffix': '(38) [1153]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '1154', 'suffix': '(39) [1154]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '1155', 'suffix': '(40) [1155]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '1156', 'suffix': '(41) [1156]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '1157', 'suffix': '(42) [1157]', 'lines': 4},
                         {'local_label': '43', 'publisher_label': '1158', 'suffix': '(43) [1158]', 'lines': 4},
                         {'local_label': '44', 'publisher_label': '1159', 'suffix': '(44) [1159]', 'lines': 4}],
              'paragraph_hashes': ['59d34d545f17a6426a2e9d41b5c0808af0d8ee113a9cbfe441ef64d380d5a77c',
                                   '3239773b2adf29a07ffae9a1b7fd4db02068a9a6590bf63e1ac2026e71633d39',
                                   '5a4539433b6483525a50a63050fb06589c004b070843efc3fa2fe3b355531f44',
                                   'e47d3876f86a6010abb21fbfafa16d25080c9e4e3a55f60f39596c8eb20c4201',
                                   '917b75434a6b819c956cbe1d1b265cc276e71365fb446262be887fcb2ecddd45',
                                   'ecfdc27f2ce7c310abd4de2ce6c03962def3a95f6f80c0b812d987b2b65554f1',
                                   'dfc670ec524b212c29a9b93f9126bf87ee6dee494d881edb2b54f2f1a0d8e103',
                                   '6695fc368a4840b5e1d7244ae8f4740e9f007e53c39e8ef75fb483da20121f1f',
                                   '397f74528d93cec61b89eac3157fa3dddbc06794f1cc0a1dd8f28118efd8ac5a',
                                   '4f7a8a9f5675639112211fe2de7e792663178b7e31a4a6605caff093c3c06673',
                                   '38079e643554f112781c7f4256097c4290fb765eaf257f42c7814de68aadb6be',
                                   'f7bc7d431034b3bac726765b88e716315ed633f91db2d244e2e97c5435692022',
                                   '8f903e8bfe419af1924e6ddd504a4837f35ad888079447b2ea72a8ff3aa9c39d',
                                   '45eeeff65cf713db26351162a910da6258eda384c54e7a07f7be7b148406773f',
                                   'e151f1dbe8cd344ca82514fabdcd34ff457e4df986f5299931b4cfd2257e7cba',
                                   'c190875406b065b267aa82b8faf17b932d4df8d06331979f6bf298e8f9e7ef39',
                                   'c46914ba013acc3fcecd0171ec480a5903a3974ea5671930f8157002f7f3c8e9',
                                   'dcff675f147fcff161d2b6006ca6d37c5050a273ccee220a62a3ba2bdb480eef',
                                   '9f7f759f8143ba30b1ffda7a3f5214acd9a53a1f07cd2ce115dc6838f54fb6f1',
                                   'fcfe16d70b73f8306e1ec7b15b0eec60ac1c45c2049c02ac4124820b0c1751d4',
                                   '364a882bcd36a92c95c81b512c7c1ddca0731cf1853c18777721650e7f63cfb4',
                                   '44687ff7f3f84e2466e573363f6baa45110d3fb2b1ca666270ba64f3d40097b5',
                                   'e360f9198687b95514f7ce40bd91ba7fbad54e7ac801f2f66d9223991dd69c29',
                                   '618c761b8a23bfb332e961c212decc8aad99c7ae83da8fce80470f9675285c52',
                                   '516527fe6c81d38bef09e691d5ca2ab2c09944570945140fb346b81975a2978a',
                                   'b807e99063f239f16029917801eb5adeaa550d807c3481e6416bb24e521b5f9d',
                                   'b681eb88012261e372ba7d79fa0a29affc7f770e2b653f03af4e524a1de1d28f',
                                   'f00802af91090783dc47ab0ff02c8c72a8841a1ece798c37a2a64919b0a8b08b',
                                   '6ded41df1bb3e77bcf067ec3e3c884e85cc94c317178361dd75de6054cb7bf94',
                                   'b56757f81ffb1ce97e2c43dbd02adb64afc6dde0b41ac6fb8dd98ff9a576088d',
                                   '7f5ecadf173e55497780eed8a97f12ed95aa3f2c9b17f18229b1969c9bcd4b4e',
                                   '4a20d3e6054bca86a04a2f0551f3292b750def3508e66347188ddb933e86640d',
                                   'c24cd68c675eca7aa83eda9ba325cc038298bfde6c2369d6fee8415d0b413fd2',
                                   '14bdafdb8de1a003c6ef5603ca66e4a6e07a2a2305862f76badf978666a18d38',
                                   'cef915adbcdd2785013edba3e4d96d99d1012022fae178aba332f05d63f43cdd',
                                   '91302e17b7438901e54fbfcc2e33dd7151743693ffbc90e027dd8d688e4d7f96',
                                   '73d8df485899b838ff64b6ec09b4d2e1fc8e9cd153ceb1b6c7236ee4952e9b25',
                                   '3bf59e6525dbff45dc6ee2207fef640238642a9001c01026d45c2091cfcc1a1c',
                                   'bde9ece357b8e8f5e64f2b6c62d5b2a7b1c41feabb7529cfaf71f6ae6fedc640',
                                   '08686aa84d2cdc5456d208f7a2c25eb2af72f454fc670667108abf4606af97bd',
                                   'f52b74f90dc8839e59dd2463eacabfa8c88b3b25a64b5941597b5fa2530968c9',
                                   '67aff365d6567fa6f076a7f88ca0fc853243bce086023ac5993a2e5a9bedd4a0',
                                   '5a215c34084e1edc62609afa3d4773ca7ba1a9c587c7ed770bcea7e4350c154d',
                                   'e4bab64cc8f80351ef1b862ecb6c68f8c58792b1d3546cc20fda74e95ccffdec',
                                   '3a7b0d168cd70ac3d1309d2d0e3b9e7e18be6487b7484acad5debcca103c0341',
                                   'a5525fd6f1e9d3643181cbc1161f45e8da25056b37512d2ece3b8346347b5472',
                                   '44a304eae497e743e51fb0d4c3ebd72e7c48e585283eae74ff55a492ec14ace5']},
 'thi-ap33': {'raw_sha256': '038a60e4a260313ea2a8ac2c2ec403ec468056dc880107437e50312e85fb7551',
              'body_sha256': 'bd7f2d19c455d51a487ed13e079f223ff665e022d7ee69389ca66ff291c95ce6',
              'notes_sha256': 'a2014174d669427ad49bbc752ebfe569fb1d8d9458dc09b91c192d7e13f918ce',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '5eca076afa0b14d18aad94f539e4abd0ce32e9995bda286bb16d80d3ade150f0',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
              'layout': [{'local_label': '1', 'publisher_label': '1160', 'suffix': '(1) [1160]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1161', 'suffix': '(2) [1161]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1162', 'suffix': '(3) [1162]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1163', 'suffix': '(4) [1163]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1164', 'suffix': '(5) [1164]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1165', 'suffix': '(6) [1165]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1166', 'suffix': '(7) [1166]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1167', 'suffix': '(8) [1167]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1168', 'suffix': '(9) [1168]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1169', 'suffix': '(10) [1169]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1170', 'suffix': '(11) [1170]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1171', 'suffix': '(12) [1171]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1172', 'suffix': '(13) [1172]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1173', 'suffix': '(14) [1173]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1174', 'suffix': '(15) [1174]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1175', 'suffix': '(16) [1175]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1176', 'suffix': '(17) [1176]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1177', 'suffix': '(18) [1177]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1178', 'suffix': '(19) [1178]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1179', 'suffix': '(20) [1179]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '1180', 'suffix': '(21) [1180]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '1181', 'suffix': '(22) [1181]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '1182', 'suffix': '(23) [1182]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '1183', 'suffix': '(24) [1183]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '1184', 'suffix': '(25) [1184]', 'lines': 4}],
              'paragraph_hashes': ['182080e9f5b33dd2a0c7e3c73e78e0f72203bd48574c95a5cf960fbd4b8809fb',
                                   'b6f1be27d353103ebd3c8a0f62fd0477e4f1cf0a35c689b12339d7026b7ab305',
                                   '33413f35b59b0baa38109455520c09d94ccfcc8fa611962756c7141c088a4fe6',
                                   'd7047c44ca2d96c74e19763e81bb6548fc7e6694070cf7979576fb0701695577',
                                   '1b977430d4a9631d83b8b93f8a3e3acaf07534219d1a04b5f2a543add5032e00',
                                   '12363c6a1e8a2c5f8d467177dd0465b83716620432505756dcb99b570347e217',
                                   '2c6407151e14bc6570a89c29f6041244204b0794737b464f93aac067dc5f16bf',
                                   '1b1d5739c6704b9129a7a1adbdb45ef06279017315e60c53e8aa1c582c9ba0c0',
                                   '250050a50db7a8d20282520ecb7c308f37534b704181e63660cb4ec6f5ee9405',
                                   '1956d65da0cbc39aa4eba9fe394500090d35b4eacc34ca1bd43b034d769a4ec8',
                                   '5553d058b9510ea11249cf13dcdffe91517d7e548d538bb706c2760281562621',
                                   '7bec746121c1a8f71d6a27065f1b76066d2fa853534000a9849c7a58140bf442',
                                   'a80c3abf6225e6872f01b1ddea480ec7b8082de6551eff48865e64a8208c2ffe',
                                   'ba42cff3596c62f94db772e913ec07b5e2c5789c146ed79263b457ad398a28b8',
                                   '41fe405e1e99f257eaf7eab536cb3449077ad721d5c3a44812f1158dc9fdf9c0',
                                   '62020222d570f37aef41a682ca7485b52fb2c3587ccb02a1049ba93133d90f59',
                                   '29dc40f80e02eb4c2a106cb1f48237c5f0f1c56c03f4eb208c71de71e40bce9b',
                                   '983ffc141d03d9978bed5f820f0cd6ee9bc9106da794b9ca7b14a21d3a072a63',
                                   '559eb8414cdbf95d7f0eca56cb04454d9ead762655d895fb421a6b6dbc051f44',
                                   '5d1228432db64817e72e791dfbe842fb741d24106d06fb9c13baef9aba887274',
                                   '38d4f477ccb3ec41f45154db6365ce744efba10a4486e72d950f025b20da3459',
                                   '56b111d54036cfaa9b92d4b1246f30f760462c3efb8d641e9e8a7151e164c60c',
                                   '75cd41c1974b8c26febc276a1e6e9129788c654f6ad6e9a7bf0d4a465ecb2106',
                                   '85fadf40740d800cb282cc566873e21fb452be5208ba9301d9f790d486695d87',
                                   'b7120e3f506e4264b872e12e0e129fa2f0f677a2d4a5f1ee2ee7181e09a4bfb0',
                                   '3e5a6922dc4e6f9330ccaa029c00957b197afe680c884478141ac9e6109bf251',
                                   'd8a2fd5bffabe7565cdf10dcdf4f71ede259af9de5b63c844827144e5e6ba42e',
                                   'cc94dd6863c62b617e557650c3363fefbf7ebdf414e537751243af9bef0ba0de']},
 'thi-ap34': {'raw_sha256': 'e0154f2ce268186473982f14d624ee53864b821d1641b1c7e584e12116f26730',
              'body_sha256': '1bc189192349e28b69a740727794f6ecb322c7d952169bc103a8875e2d0b581b',
              'notes_sha256': 'dce589625a94bdae609b80983c2a1d5d1c8d749696c9a617293cd76e09b8ae7f',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '86b5a7670aa587cfee9f9b0488c382caac9540d3f314d5b49b728c3a993a1dce',
              'notes': [1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12,
                        13,
                        14,
                        15,
                        16,
                        17,
                        18,
                        19,
                        20,
                        21,
                        22,
                        23,
                        24,
                        25,
                        26,
                        27],
              'layout': [{'local_label': '1', 'publisher_label': '1185', 'suffix': '(1) [1185]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1186', 'suffix': '(2) [1186]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1187', 'suffix': '(3) [1187]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1188', 'suffix': '(4) [1188]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1189', 'suffix': '(5) [1189]', 'lines': 4},
                         {'local_label': '6, 7a-b',
                          'publisher_label': '1190',
                          'suffix': '(6, 7a-b) [1190]',
                          'lines': 6},
                         {'local_label': '7c-d, 8a-b',
                          'publisher_label': '1191',
                          'suffix': '(7c-d, 8a-b) [1191]',
                          'lines': 4},
                         {'local_label': '8c-d, 9a-b',
                          'publisher_label': '1192',
                          'suffix': '(8c-d, 9a-b) [1192]',
                          'lines': 4},
                         {'local_label': '9c-d, 10a-b',
                          'publisher_label': '1193',
                          'suffix': '(9c-d, 10a-b) [1193]',
                          'lines': 4},
                         {'local_label': '10c-d, 11a-b',
                          'publisher_label': '1194',
                          'suffix': '(10c-d, 11a-b) [1194]',
                          'lines': 4},
                         {'local_label': '11c-d, 12',
                          'publisher_label': '1195',
                          'suffix': '(11c-d, 12) [1195]',
                          'lines': 6},
                         {'local_label': '13', 'publisher_label': '1196', 'suffix': '(13) [1196]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1197', 'suffix': '(14) [1197]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1198', 'suffix': '(15) [1198]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1199', 'suffix': '(16) [1199]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1200', 'suffix': '(17) [1200]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1201', 'suffix': '(18) [1201]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1202', 'suffix': '(19) [1202]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1203', 'suffix': '(20) [1203]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '1204', 'suffix': '(21) [1204]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '1205', 'suffix': '(22) [1205]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '1206', 'suffix': '(23) [1206]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '1207', 'suffix': '(24) [1207]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '1208', 'suffix': '(25) [1208]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '1209', 'suffix': '(26) [1209]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '1210', 'suffix': '(27) [1210]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '1211', 'suffix': '(28) [1211]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '1212', 'suffix': '(29) [1212]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '1213', 'suffix': '(30) [1213]', 'lines': 4}],
              'paragraph_hashes': ['17f3f45cbb75f76e5eaa74b0a7f655475097e4cbbd4579c6bbd3cbf1b4ab4db0',
                                   '3d8dd347a45f4af7c2c6196a39a8d27e4bc564ece96bb65039fb0e36900de04c',
                                   '4f0a6cdf41ce04f2309b0a84e9b70b78f7beac4cbdbe3e677e2e3631b47d5227',
                                   '407f8c99e96629e05efbb8820d5c4c80e14ae62c459d7a37df5977cf3c4b58b8',
                                   'aa7fe10e742fe46548bb72309e30a7d34e802b8c97bd1c6924d5bece1b8c1e62',
                                   'db559099b0527c05f20b4af5b9734c53082a94a661f2b59d6b973fa6ba16e2f4',
                                   '7f23a7c7d7d0d3960609457ea9eceabff27569940120b4ff08860a8b67a86fbb',
                                   'b7a56a3bfb93b0f6c1e5ca8d2c5222eb9b438587cd2a1711f04bf64990ffac31',
                                   '72eafc6ea1c19e9497e9be325e5937dca0323f4d6b8366e2819fb6a7feb1ef77',
                                   'a3ce0ffbe71d5c08371dadc4402777664c01c033ad3e2c84724304c2d64a6e13',
                                   'b70fe41165c71bd8aa54d1ed49b4e933e06615f5afdfb7577b476f3f1c9e0ee6',
                                   'b6be09c799d3f139efbe186c7c9acf45c711a842ac6f1d48b45bc8230176fe4f',
                                   '3ae2af3fc248f57db9dc29b76745127e2079e5d3d8e10b45220579b611cfb1bc',
                                   'cfaa270be4fde515cbf4680c804ac77218995dd0ffa93765947ff78dc6c58050',
                                   '3d4386c0232350afc5e07265b6d2c94a47e5f31d2cadd9159f0c2d3acb40cfc4',
                                   '507d61b4466a252c81d95e1ce63f49381f808b2f5034affc54bb5ac0b5ee7efa',
                                   '4edd8668a46a6337e233f426f50911eedbd41fb7a89e9e4d00294aa520388bb1',
                                   '39d49f358868f4534774a76f13250632b31ff902d7395810ec77692cad756095',
                                   '9edc4d848491de029e150a3ad484a74d3b044022f76fb6a0c000dda3d718a521',
                                   'e4f03397477b3ef8b998d1b8b35a043b0ced59ccca790231ed419b6e41453f60',
                                   'e327134d43fc6ce7f20b6307da00d1ef303f68032df08a574e91e17a4edbaed3',
                                   '47af12ff52cbbe403dd1f4e5f8e0a2c99c74e19eb411ff826e3ac98c24e6f424',
                                   'b88ff9c8820e5dca878e518093f22919f9119bd5696ac97382d83a19c254b0cd',
                                   '0a86bda13f9c5e873bd935a43c305b7a1113e7bd42b80a16ad290a7b00299294',
                                   '41487d91b437b74173bf5e5298ed6997247e1f1fc726c448eb9eb53a7195128b',
                                   '18d1d99b5c8a79c5f4e9ef40da097a0c639c8cd516b0bab9d94fb369fca4a5ac',
                                   '5b2af14fdbf29888a8dd2b11118352b85580eed552a11c6b1802da0824805c1b',
                                   '48eb3846f276af94fd5ed39320b3835f755ac8695daea597f29e3e65dcc41b6e',
                                   '6c7701ee3f0b6af4bc30debf1b4d5bfaab5b14fb1ce0949092012e5de5f20042',
                                   '7dc95a8eb0a0124037d584b58eb5e2db3f96fda68183d653c9ccb899ddc62a4e',
                                   'b310ecdf9a392707d4bb9236fc4e2fb87a0f447df37ee93865e4c3de5f605f67',
                                   'a57fb43a091754421711933e37556fd2aa85f28af53e08e5075d1382fa5219a8']},
 'thi-ap35': {'raw_sha256': 'e9f5fbbcec6be351b4a08ab4274794f25709d602a8692a3a73b93b9fdd911e2c',
              'body_sha256': '5731cb650dd163d542d681cabb541eca2047e7044494dab0b1eb126cdfa2d9b7',
              'notes_sha256': 'd66b5557d7507008c1ce84eabab9d078477135933247d9119c86fd1b574eb9d1',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '4ac405d1255b3a8305d84b5adfcd8f7c01685b97044a7146b2c6868a20c46d71',
              'notes': [1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12,
                        13,
                        14,
                        15,
                        16,
                        17,
                        18,
                        19,
                        20,
                        21,
                        22,
                        23,
                        24,
                        25,
                        26,
                        27,
                        28,
                        29,
                        30,
                        31,
                        32,
                        33,
                        34,
                        35],
              'layout': [{'local_label': '1', 'publisher_label': '1214', 'suffix': '(1) [1214]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1215', 'suffix': '(2) [1215]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1216', 'suffix': '(3) [1216]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1217', 'suffix': '(4) [1217]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1218', 'suffix': '(5) [1218]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1219', 'suffix': '(6) [1219]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1220', 'suffix': '(7) [1220]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1221', 'suffix': '(8) [1221]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1222', 'suffix': '(9) [1222]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1223', 'suffix': '(10) [1223]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1224', 'suffix': '(11) [1224]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1225', 'suffix': '(12) [1225]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1226', 'suffix': '(13) [1226]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1227', 'suffix': '(14) [1227]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1228', 'suffix': '(15) [1228]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1229', 'suffix': '(16) [1229]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1230', 'suffix': '(17) [1230]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1231', 'suffix': '(18) [1231]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1232', 'suffix': '(19) [1232]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1233', 'suffix': '(20) [1233]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '1234', 'suffix': '(21) [1234]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '1235', 'suffix': '(22) [1235]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '1236', 'suffix': '(23) [1236]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '1237', 'suffix': '(24) [1237]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '1238', 'suffix': '(25) [1238]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '1239', 'suffix': '(26) [1239]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '1240', 'suffix': '(27) [1240]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '1241', 'suffix': '(28) [1241]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '1242', 'suffix': '(29) [1242]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '1243', 'suffix': '(30) [1243]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '1244', 'suffix': '(31) [1244]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '1245', 'suffix': '(32) [1245]', 'lines': 4}],
              'paragraph_hashes': ['e8d546dc5a333920a97203cd5f86641fd25b2427e3f6a69765cfd5fba32126ee',
                                   '07f2f09638eab0604c1e8aacf42f5ffac31f918a7038403706d1a657bc1e3de0',
                                   '3a14bf39ff472effa2611b7294db21d85d689a47fcaf0b021dd1677bbd6d0779',
                                   'cb420ef48f948eabe08961ff232b674e4a8c8cceeda67c4ea7b05523d01cfd5a',
                                   '14e63089eb2d8067d228eb5d30ffb452ce7c8467159c4f92324ecfe5eb042f72',
                                   '8c62f1aec382fa03726ebe845a9ab1d5ca9ab7aa99fe5bb2c3e874ad2e8a0d62',
                                   'e2ff5d2718c2c2d7c7e9b2b2a02464442ad75c4d7b136ce0bb15b08215f49221',
                                   'bf8f920891915eab82d4c7311ac00516dc93da2499947f105ede62e8d0873d42',
                                   '06de7143ed832454e2a6304cb56521a4065f157181cfc367d250247edec1c27c',
                                   '26f9c6e0b3af88ca65c4a69b7b9a9294b93f0cd2b3f30fa85982d3ec1d533845',
                                   'a8211f4163da148dc7fb87e7dcd8b95c3ecad74580dcd79f3236a1a8e6a3f78b',
                                   '03a7c238192a6701196069b61fd882e83e5e311b5ac941afc1d4992277c0be8a',
                                   '14ffc0404ef14b10ae09a495959a13b09b5bcb75bdc6885be52cefde8ad9576e',
                                   '82af45c3c4c3c9691ac5a52676e99d1912d6513c758ddfef191a3337ba82d8b5',
                                   '042aaa6d24cdf5f8b23a74d69ef88132f7bf86a95a16aadebf40645a03f3e2b3',
                                   '85ed82fe6c7d71636320d7bcf42fa0d9431bf6811c3ee50ef71aa4f3a18d9184',
                                   '45dbe58ae0ad98ab360c33c60c7d648f9bd04b1e0e31be13c4337c3b3e899481',
                                   'd60ac612d5551d4e465c7b9f558d841f69ca9f916b5d7a4dff8c323537657842',
                                   '7057b58b78266fc79c23b28a57b8cfb9582c43567936f850230cac8e017ad577',
                                   'b114d73cf2e02988f3dce899570a58a3db3cbd639f69cf8d14cc7c6e8cc834cc',
                                   'b088127b634652fd811b9afbbda486d18435745afc4eb241f858f906084e9136',
                                   '93fa32b000f1a5faa1497ddfeffa8adcf2cce42e17e7520411eb96bb980dd41e',
                                   'c6f0c0787ff962c55b47947925618a1e51f1a8ff56c9f95d2f968fa68763bc30',
                                   'b1bc43b7b010e4882287b2d0dc60e4158d5a61581f689d8078ec7bdfa3b8d80f',
                                   'ad92d0efa3371332968b887c22d7b62c7202d21c5b14906a35abca42762b23ed',
                                   'cb3e71cca8f2cd4244ff01e4607fa8e1dbce67c6f7af56df547fc9bbb6aff02d',
                                   'a01ad3f376e300edfc964a866abb8f89ff3abc29464cbdb041e1d056f0a48dd1',
                                   '327e51e02967f1aa1c4985ec222e32c1a051c38cdc5767189305feeba26ba487',
                                   'e79dac37b7819bbd67da60a020d44370e39efe757d7d820ecc73ef66541efece',
                                   'ebe15ae613f9f8050e5101e1bcdc213f57b0ceaa63c22c06cd2f1cf43c1f44a5',
                                   '8a81f1fed2d99f7bdb97622ca972fbeeb9bb4f89f1cab7985dc06cf91aec7c28',
                                   '02c4572ceab23bab97ba0de79e1587f9d0afb09c5eca203b574074e6974ae8b5',
                                   '89bf443068028de05ae580c210b23deb1bca8d3bd8cae8c2d977b7764f6fbce9',
                                   '2c3b752cafdf248ea003a8bc117cc8c14588aaad41e865a5b846b2342db21094',
                                   '29814d160e82ed5fcdddb3e23c9fb650fce7d1703f3bec52dce9bed9f6ae0809']},
 'thi-ap36': {'raw_sha256': '2eb3978453371cecec8eee6e75e21bd1f990cd2f814fd47e5bea8109d2cd2744',
              'body_sha256': 'd5530965997e3cc75fd078608acffe84c32fc7a4684dcdf06258a42a1a31b6f7',
              'notes_sha256': 'fbc5f9aaab148be3158dff7197609bb694265dbac3ce522acd697cdab8c5bb76',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'f47836eeda85a4ff088935edf1948251f614a01d07b1b42597459625b93e36b4',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
              'layout': [{'local_label': '1', 'publisher_label': '1246', 'suffix': '(1) [1246]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1247', 'suffix': '(2) [1247]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1248', 'suffix': '(3) [1248]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1249', 'suffix': '(4) [1249]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1250', 'suffix': '(5) [1250]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1251', 'suffix': '(6) [1251]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1252', 'suffix': '(7) [1252]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1253', 'suffix': '(8) [1253]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1254', 'suffix': '(9) [1254]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1255', 'suffix': '(10) [1255]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1256', 'suffix': '(11) [1256]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1257', 'suffix': '(12) [1257]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1258', 'suffix': '(13) [1258]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1259', 'suffix': '(14) [1259]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1260', 'suffix': '(15) [1260]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1261', 'suffix': '(16) [1261]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1262', 'suffix': '(17) [1262]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1263', 'suffix': '(18) [1263]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1264', 'suffix': '(19) [1264]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1265', 'suffix': '(20) [1265]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '1266', 'suffix': '(21) [1266]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '1267', 'suffix': '(22) [1267]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '1268', 'suffix': '(23) [1268]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '1269', 'suffix': '(24) [1269]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '1270', 'suffix': '(25) [1270]', 'lines': 4}],
              'paragraph_hashes': ['59ad2484c975a4ee600f1fc354072025f1958628850adfe9c2dd3b986680269b',
                                   '32baeee345b52091cfab3fca31abd7b2009dbebeebda714d41bfda7891c1f4c3',
                                   '714807fed0854f436271de17341a5e0ff857162adadd545fcd53de0fa43b8f29',
                                   '7df681e0672b5005eb7cc22700fa0633d4edc086dbe674c48e7bd1698ff9425d',
                                   'b5e1f5dd52c06b5ff8600d8659e2cd50cb0b68d8367cb45906c4bf0c74c1ec8f',
                                   '5987be2ddf1fe280e956525d9175be39daf5acd75c9174bad8bf89eb225370fa',
                                   'ae8b57042055d8c8913e36a2f6f2d3c9b7e25ad64e2ff90847a6852770039bf5',
                                   '5ae33d38f0d37fa01854ae9754249c714b6066b88df81315107d8abc7b0f9b48',
                                   '0126c38d046df7bc24b455b8026584f872ae6b5c4c098cbeadb17fc3c4b50798',
                                   'd0b9f5f918e4323508e9a79a37ce4377478a62a32bf59fc1d64b981a7679fa17',
                                   '6f19c854621db4b2f903d071bb53cea37b408bc59add6f5a31a47bf64b032a81',
                                   '0fe5d2d41dffbd38c9f9c8702fc7f1ac43a2f37a3ddf4920e9dcb833cb1449b3',
                                   '60328af49aac1b27f095b800adee4e5ffed2899a2dbe687a6676eb29e9d89e51',
                                   '0a6149e16c35da993d5ca3a3182266cd9e5e0e40e02869b0f82254b9ecb6410c',
                                   '16194222a3e9635dbe9d346936d43df2552ffe5ca1bb8ea07f878ac0c260a4f0',
                                   '7a0a56318f97a8a2317072351dcd94ffc4af033dbabb0a1534a58e79029935e6',
                                   'a37b0e52286586a5b0fab17f47da5838bc7a36e8f59665c3ef30ab2dca8f8029',
                                   'e47edd0b874f82586dc652891352a936de9ba583a79e5dc0f029268754db5fcb',
                                   'c5e1fa1b4f1526ede0f9a491cb158b16758ca3e79de0abda5c896fae60707672',
                                   'a50b42e71cbdff27e208ca5362468efdcae80d94fde573ffb33d9bc08ec32fee',
                                   '68b603b239f6e49fbf12ab7286acda2d2948e48c1a34694e0baf06dc5d7380fe',
                                   '12c2d68d007fcdc8641a29c09818f7b67a91211cb39655369aea5380e4a2839e',
                                   '596e638614cfa4191052c8a0ca6a8379f51bcf133fe9e55d17bf1d472cc2844c',
                                   '620eac42dfa8059e5ace9d42f20343f8f600d0fbf7631a5d0460357732643ff5',
                                   'c4bf9bde7573f0aeef5fc03812890ad62f2c834a7c982af5f767bc706f78ea1c',
                                   '0363a199767a7a9cbbc0e30c937f9f511cc75543e1e532f7ab60d4343e5afe14',
                                   'b5a604270f2623608cfeecf7b7af08dbe177984c9e4661a4d3f47732d993b772',
                                   'a94d01b2b319b0555c171ff4bd65045f6140d63cfa6d724fe6daec64dfd87650']},
 'thi-ap37': {'raw_sha256': 'a9f6519bc736eb2eb07d1ea8e4967014ecc09d3ccd49d6fe61b7d6de40a45fef',
              'body_sha256': 'b788fe974bd06d277daab1f80b1276cf044fb2941775b25862c4583c94ddb48f',
              'notes_sha256': 'd405f97f37f762089eba4021b7bc74129e63a1d973631631dd6f59f7ee18dae5',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'ce1a7dcbee24ae04a376c33a716abf0b9bd9e3d51b75c7e12f695d07c5f5d74f',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
              'layout': [{'local_label': '1', 'publisher_label': '1271', 'suffix': '(1) [1271]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1272', 'suffix': '(2) [1272]', 'lines': 4},
                         {'local_label': '3-4',
                          'publisher_label': '1273-1274',
                          'suffix': '(3-4) [1273-1274]',
                          'lines': 8},
                         {'local_label': '5', 'publisher_label': '1275', 'suffix': '(5) [1275]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1276', 'suffix': '(6) [1276]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1277', 'suffix': '(7) [1277]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1278', 'suffix': '(8) [1278]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1279', 'suffix': '(9) [1279]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1280', 'suffix': '(10) [1280]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1281', 'suffix': '(11) [1281]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1282', 'suffix': '(12) [1282]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1283', 'suffix': '(13) [1283]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1284', 'suffix': '(14) [1284]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1285', 'suffix': '(15) [1285]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1286', 'suffix': '(16) [1286]', 'lines': 4}],
              'paragraph_hashes': ['8296bf49e603a9824390374fcba394af2560817514e3bbb9c9a9e2c5b8ab3a24',
                                   'b20dd3ba014264e8f228ba97f4f25f4ce722585342e698f81ef7d592fa97b701',
                                   'a84868575328a9e4419fd8f629226953e74ee6f8e91e543c56839b4db3138fa2',
                                   '3414f34da90c063f103e9ce53dca1e086a4ee32885af29fea04c79e93c09735e',
                                   '8e685e4cdafb9ffd2da1a4d22b4a04b6877806be0db7f4dd3f7c7404f280d6cb',
                                   '911905d914cd53e72b89eb1312c95296715eadb3334ddbbb34ca22ecabc7226e',
                                   'aaa4e5a7f12dc44969dce9285c675a363a1cbd4efe97f233f749f054ac3dcfed',
                                   'dbee9702a9e4bb4079de3b8448549e9bb7ad03a180ba79b622dabbe2c0aa7d85',
                                   '77ee36634b3adf88505835b1b94daed392d24248d097b6e5b1c6ec5dd2131ffd',
                                   '3805e54ada65072586289d1231b19f46ec5fdf9102194e264cfb843819382f58',
                                   '0c4c3a02fc91ad66c51160324c83945359efd5004c1fcb41d242ec9ff3cb2bca',
                                   'b9f89862fe6b767ea7a8649153a98c09bf9434672a1c131224443c629304cb97',
                                   '84d5bf31c6ee4b4b322fca8c08e3549d8f17ca94bbd4f04d43721303f9494cd0',
                                   '119802815b3abf0678a744579dd64d8d83ddf95cfb11de7a4827f36332f0dea7',
                                   '587bdcf53a5f021cb069d9bcf380dc8f6a92b93fbbd1685b44e493c64e661ab2',
                                   '57f2782ce8c2e66493080f98bdf4270088bb1437a60832017bf8a26cde0a32ea',
                                   '6cd7914e32209ad4fc2998fca1eb6639426535eedfc887b3ef8fffde6b74d105',
                                   'fdee36428baf12ab778ba856dbdc19afe9cd9e9c07763be11a4d4d39aca9e3ca']},
 'thi-ap38': {'raw_sha256': '172cd2cdeeb1ecbd8f3340ecddabdbbe3ffbe2873f748b19b4d72c3396aee35d',
              'body_sha256': 'e5a3defbf6c8aeed0ce94b6242509c704b9a745b1aff44db68a29694c61949e3',
              'notes_sha256': '19c4dc072ac575ced778b7125719a750c4927f08d575bd3d9adfc7e1bc622932',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '7abf75e2e32eec2471ad8668a999ae5e65708ddfde242241216d00137fec1a2d',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
              'layout': [{'local_label': '1-2',
                          'publisher_label': '1287-1288',
                          'suffix': '(1-2) [1287-1288]',
                          'lines': 8},
                         {'local_label': '3', 'publisher_label': '1289', 'suffix': '(3) [1289]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1290', 'suffix': '(4) [1290]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1291', 'suffix': '(5) [1291]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1292', 'suffix': '(6) [1292]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1293', 'suffix': '(7) [1293]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1294', 'suffix': '(8) [1294]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1295', 'suffix': '(9) [1295]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1296', 'suffix': '(10) [1296]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1297', 'suffix': '(11) [1297]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1298', 'suffix': '(12) [1298]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1299', 'suffix': '(13) [1299]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1300', 'suffix': '(14) [1300]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1301', 'suffix': '(15) [1301]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1302', 'suffix': '(16) [1302]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1303', 'suffix': '(17) [1303]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1304', 'suffix': '(18) [1304]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1305', 'suffix': '(19) [1305]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1306', 'suffix': '(20) [1306]', 'lines': 4}],
              'paragraph_hashes': ['e8cbd3edfea55921ca776a412c19e72470bab631db131034af442650c9b3efff',
                                   'ba217bf9a6c55b6ff82493de53058ff69526e4d6aa8c6d977a834b64e43e1163',
                                   '219a031bdb65e9d1fd46dec20e45cebcaa0576a67f7e414e52c131a90550260d',
                                   '88371931e25ea3547ce70ef81e1ea6658073d5c4fb9bde2843d8db110f8ffd5b',
                                   '57abc4c29d8e483fba7c1a08820c215e00e5ec7a8a5b5a68bb58a1215feec36c',
                                   '1746d1cf8a361b724603df7036cb67e32b190f154a29a30fee25d1f640d81705',
                                   'bc73408d4abd942740d2374babba6d5ee859afa9f4174753c97551695bd5879d',
                                   '7a6dabf9e86eaab875b416031045ce2e85cd1392b326a4e122d156e7e245c3ae',
                                   'd7add0488969b0daf146f3dba94ff5daddc82b7c914243e3c72ed2fbcbafc678',
                                   '6691952becae819c0e7ab169e0a0d9fd862941816a0857b5c9e3b7c0e39d1a66',
                                   '9523be354b5c99b5c5a863d31481668baee9517f5144fd7bf332a9d222ad35dd',
                                   '97c865a9a51dd022373da2f4c0418f80d5b01a42d3d9928b803de410adf398ac',
                                   'a620497268a508efb44b7914a0d2d2620cc34f7504a7ab0cb8d5ab8dbe1e1849',
                                   'f9f5f8df93dc4306287cac79ec695801b61cd3d27e5c0d776e2b6807425e8a96',
                                   '75403387228ef959860cc229885ea02232b671ff5a35eed0c6a334037cea7ee0',
                                   '6e2a55df3b9ef7c0f176f128dbf93e2bfacab8b7d53452ae2f9e00ce07fbb47e',
                                   '5a099b95aa88fa29d66ed937177cb1f55abc93789cf2e69f44b23d33c5b3ab78',
                                   'ae4616f85aa804096c77a9429f828c549d5625bbe4e482a340e2d3942ec6b877',
                                   '762fc000f948c12be16636af1337c0be977e6379cfae9b7a4b99f0820706005b',
                                   'b6907172b4efd3b44b507d8169ada104791753f269c3c8d9422ab805eb2a7fbf',
                                   'c501aad055e87b2a54222473ce34bd10b989c5bb32a71ee74dbd22ea3403add3',
                                   'd2ff43e6d96da22350e36279d9467f2436a6598d3bfa7ff22cf9a77a22aade3a']},
 'thi-ap39': {'raw_sha256': '96ac7bd3f8e4d96b7accf7b499c468d3214c674c0924c053d5a445510541c51f',
              'body_sha256': 'b363446b795d48994f74b06bfaa21e6154d8634a88ca96be092f91732a81af15',
              'notes_sha256': 'eabae3d27919b1fba7c63ee2b7dcc7b5d6cc433cac97828b2735ec8104c266eb',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '43cdcb149885fcc1f482b09160528db2bba31d8d0abbd661d3cafbe9f77c4a1f',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
              'layout': [{'local_label': '1', 'publisher_label': '1307', 'suffix': '(1) [1307]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1308', 'suffix': '(2) [1308]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1309', 'suffix': '(3) [1309]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1310', 'suffix': '(4) [1310]', 'lines': 4},
                         {'local_label': '5-6',
                          'publisher_label': '1311-1312',
                          'suffix': '(5-6) [1311-1312]',
                          'lines': 8},
                         {'local_label': '7', 'publisher_label': '1313', 'suffix': '(7) [1313]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1314', 'suffix': '(8) [1314]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1315', 'suffix': '(9) [1315]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1316', 'suffix': '(10) [1316]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1317', 'suffix': '(11) [1317]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1318', 'suffix': '(12) [1318]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1319', 'suffix': '(13) [1319]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1320', 'suffix': '(14) [1320]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1321', 'suffix': '(15) [1321]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1322', 'suffix': '(16) [1322]', 'lines': 4}],
              'paragraph_hashes': ['4456990527c65409b7520287762286a20a3ed5cb9038979b1bf4a0fea00ecb1f',
                                   'a5d2151d8c3eaf737d4d063352899226aa08dd6161a78ac4bffe1fe260c1018a',
                                   'ff28086af993bf162f8685397a073ce96a1a8446dd200055c79dc7f07a2e182e',
                                   '9725dc4ae992df172b183ebac8d6f3a1e0473036a5a24c4939a958dbcccec827',
                                   '70bae14bd32acf443ff8008e163cca5f1012a5fdcfceaac74024989f77ed1b4c',
                                   'ee1db3f1391a733fecc5aee9c4bb5c9a2f40d0c4c7e932e26f2898b3d480ee85',
                                   'e55f739eaf24f8cce4e4d6bba9b6e159326c30ca36a4691303d2bb8024a60822',
                                   'beb952b72077e26f40f0e54523d7ce44131333bf93409143ed70b171b9e89b43',
                                   '390c872c9342e53b93edee442518d97e534523c129ed8f3384e4512d16170d47',
                                   'ff36511d410a5cd918022499d62e7733edfe08d35dcd10c7d9431ae8834f509f',
                                   '816a008e5d9be36c75de54d00eb18786263d47feaf0014818cf41b2de2bee258',
                                   '0e00345e5f924972d6a6d7c0974704dcf8ff8d8596a4328eb4ab4646dbd98537',
                                   'c8193ab4c19614b5ee75d6b7b3cf40f700dc081b194fb9e5a67041087eaffd38',
                                   'e7cf1f676aaa34d8e23728847e01bbf87a661d28d636f61c35565e23ae03048f',
                                   'a55f0aa1453750fa529e8c824ed9c4f522a403152d1b9940574a5edc962ab828',
                                   '0448379201e6c9a7313fb9ab822fdcf41546c413e83bd7e041690a63b569cac8',
                                   '9441a404c439fffcb5d400d5034af9073bb36bcdca92fbc9d1114d71f54b937d',
                                   'a0f99063f5163fc805e807dcc0f01f48628129ea78594c1d4c27268b029a1498']},
 'thi-ap40': {'raw_sha256': 'a43e89da8000284adc876c728d66474ca89e6c264566efc7e8384adbbc2664dd',
              'body_sha256': 'b87f17ef16067f108f3b3b676027e32c0ece1f18cb892eab9341925ddb5f8759',
              'notes_sha256': 'a9617fb5819b95b488b9d6c508c61a5d260d67995aa4152f4ceb5e7c4bc77752',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '3204eb4d4e27f5aae19ba137dce2c10c0d1826d1f0377f4feccb5b74d33d9aea',
              'notes': [1, 2, 3, 4, 5, 6, 7],
              'layout': [{'local_label': '1', 'publisher_label': '1323', 'suffix': '(1) [1323]', 'lines': 4},
                         {'local_label': '2a-d', 'publisher_label': '1324', 'suffix': '(2a-d) [1324]', 'lines': 4},
                         {'local_label': '2e-f, 3a-b',
                          'publisher_label': '1325',
                          'suffix': '(2e-f, 3a-b) [1325]',
                          'lines': 4},
                         {'local_label': '3c-f', 'publisher_label': '1326', 'suffix': '(3c-f) [1326]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1327', 'suffix': '(4) [1327]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1328', 'suffix': '(5) [1328]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1329', 'suffix': '(6) [1329]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1330', 'suffix': '(7) [1330]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1331', 'suffix': '(8) [1331]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1332', 'suffix': '(9) [1332]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1333', 'suffix': '(10) [1333]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1334', 'suffix': '(11) [1334]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1335', 'suffix': '(12) [1335]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1336', 'suffix': '(13) [1336]', 'lines': 4}],
              'paragraph_hashes': ['8a4da95d94f0115933a0bb9784d343367746b0680ed07ca7c290b03e5c36824b',
                                   '1588008cb35fdef7372c6b8167a77801958d9f9962f87249365734310314721d',
                                   '8060e91cbad88e6fdf361ef3cd3a68b84e5cafc7a4124e770f03b7943583ac36',
                                   '7a15a55d834e8ec8576f97cf20336cb5d5462a4978ad7ce3cb8851119a430dc0',
                                   '9e310b8d3d634a398523ed8b1d8773ae0d558cd05d2c090c5741a409ec3f8919',
                                   '04fc1c3ca41911f6f97463ad362a14a9ca52d0ba1f37c76e4d1392f1c1f75a9e',
                                   'eb7185f3ff44b0a10669f9508a4403ceaae357cd0f610f37eaab96d4edf725e6',
                                   'dfcdc109f98eaa89c0a121da3bb185ae01ea5e413d52de4debd8e569e6269385',
                                   '47b0204dca4a5cbd60378ed8bfbd9ba807534ce61209e11e710b8266d37f511b',
                                   '29cfc15fd2f3d7588d0bb323be972f56dc8abc71e182903dd5763008538dcf11',
                                   '98f02f5c2a724f154380d465e35b294ff3c9d44849c75b9b4e33fa1d6530134f',
                                   '8d1b4df0bf9b29934c80c986927a269192da5a91734e7889a2a14372664ea619',
                                   'abf863fedb6aa6e874e67c62731f83563e65d0f30402edfd6bbb4307b7d0ebbc',
                                   '8f12acc07b8badcb33e15e58c5bb52e9cccb04c081ec92458ba491551cf70cf1',
                                   'ee635fed37fc45f4ebbf6cf9ac9e681097c41e9f370a4c36167773fd33d3c01a',
                                   '370d6782d2808f8087b62fa1236cd6fc42f197c7b535953d84a1975b01f89405',
                                   '6e7995d6ecc5395d44938bfb7289d06e8c0c63863f441aea53223ff95d74b5f3']}}
SUMMARY = {'kind': 'canonical_chapter_summary',
 'label': 'Fourth Therī Apadāna chapter summary',
 'parent_id': 'thi-ap40',
 'first_ref': 'thi-ap40/18',
 'last_ref': 'thi-ap40/21',
 'root_start': 10659,
 'root_end': 10665,
 'root_sha256': '4f26144e37197d0e780f0d2b7d92d1eb5584409cd0f2c778772bee5e6fdcae06',
 'body_sha256': '4b2ed7fc17c782ae42ec3b4148b78ec9067b54e520e518d2df61fd84ab43676b',
 'notes_sha256': '0b2ed730c7852591f50f1c3147c3ca99d2cc881d2b1cab028ea2d4c1ef55d466',
 'note_numbers': [8, 9, 10]}
COLLECTION = {'kind': 'canonical_collection_summary',
 'label': 'Therī Apadāna collection summary and final colophons',
 'parent_id': 'thi-ap40',
 'first_ref': 'thi-ap40/22',
 'last_ref': 'thi-ap40/26',
 'root_start': 10665,
 'root_end': 10672,
 'root_sha256': '0b331bdef022635772a5fd533693259b252b6ff560261765061d63ea0f4833a7',
 'body_sha256': '6e9d9e84af363ef5548f56e0b4ffe2956aadb8f354865ba60312d476746c07f0',
 'notes_sha256': 'aa9512817dc2d4e48bea4cf326e26f4523311c6f7d9eb286219f318135926e14',
 'note_numbers': [11, 12]}
PREFACE = {'kind': 'publisher_preface',
 'parent_id': 'thi-ap31',
 'label': 'Fourth Therī chapter preface',
 'body_sha256': 'a097c544435ed7c8df97c64b1c122b6f19fe516750647b8b79b15221f12a0237',
 'notes_sha256': '01b981ddb8c77c4efbd548f9cd2f00f33f42ca3ad93d4d49359bdd5ae6667932',
 'note_numbers': [1]}

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


def bookmark_link(page, item):
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
    rows, commit = manifest['links'], manifest['source']['commit']
    assert len(EXPECTED) == 10 and SUMMARY and COLLECTION and PREFACE, 'Independent source contracts are not installed'
    assert commit == SOURCE_REVISION, 'Publisher revision changed'
    assert set(rows) == {'thi-ap' + str(n) for n in range(1, 41)}, 'Unexpected activated source scope'
    # The fourth-chapter harness owns 31–40; keep all historical assertions strict for 1–30.
    historical_ids = set(BASELINE) | set(NEW_IDS)
    for uid, expected in BASELINE.items():
        assert digest(compact(rows[uid], sort=True)) == expected, uid + ': previous metadata changed'
        assert digest(compact({k:v for k,v in rows[uid].items() if k not in ('english','match')}, sort=True)) == BASELINE_PROFILES[uid], uid + ': previous profile changed'
    for uid in NEW_IDS:
        for key in PINS:
            assert rows[uid][key] == EXPECTED[uid][key], uid + ': independent source receipt differs: ' + key
        assert rows[uid]['note_count'] == len(EXPECTED[uid]['notes'])
    assert rows['thi-ap40']['chapter_summary'] == SUMMARY
    assert rows['thi-ap40']['collection_summary'] == COLLECTION
    assert rows['thi-ap31']['publisher_preface'] == PREFACE
    assert all('chapter_summary' not in rows[uid] and 'collection_summary' not in rows[uid] for uid in NEW_IDS if uid != 'thi-ap40')
    assert all('publisher_preface' not in rows[uid] for uid in NEW_IDS if uid != 'thi-ap31')
    assert all('publisher_divisions' not in rows[uid] for uid in NEW_IDS)
    checkout = args.source_root.resolve()
    assert subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip() == commit
    assert len(manifest['source']['rights_artifacts']) == 6
    assert {a['path']: a['sha256'] for a in manifest['source']['rights_artifacts']} == RIGHTS, 'Independent rights pins changed'
    for artifact in manifest['source']['rights_artifacts']:
        assert hashlib.sha256((checkout / artifact['path']).read_bytes()).hexdigest() == artifact['sha256']
    files = {}
    for row in rows.values():
        relative = row['raw_url'].split(commit + '/', 1)[1]
        local = (checkout / relative).resolve()
        assert local.is_relative_to(checkout), 'Source path escaped official checkout'
        assert hashlib.sha256(local.read_bytes()).hexdigest() == row['raw_sha256']
        files[row['raw_url']] = str(local)

    def version(uid):
        return 'ap:' + rows[uid]['path'].removeprefix('/text/').rstrip('/')

    with TemporaryDirectory(prefix='pali-apadana-fourth-') as work:
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
            assert bool(data['publisher_paratext']) == (uid == 'thi-ap31')
            if uid == 'thi-ap31':
                preface = data['publisher_preface']
                assert set(preface) == set(PREFACE) | {'translator_notes'}
                assert all(preface[key] == value for key, value in PREFACE.items())
                assert 'text' not in preface, 'Preface wording duplicated'
                assert [note['number'] for note in preface['translator_notes']] == [1]
                assert digest(compact(preface['translator_notes'])) == PREFACE['notes_sha256']
                assert '[Note 1]' not in data['text'] and '[Note 1]' in data['publisher_paratext']
            else:
                assert 'publisher_preface' not in data
            for name, contract in (('chapter_summary', SUMMARY), ('collection_summary', COLLECTION)):
                if uid == 'thi-ap40':
                    scope = data[name]
                    assert set(scope) == set(contract) | {'text', 'translator_notes'}
                    assert all(scope[key] == value for key, value in contract.items())
                    assert digest(scope['text']) == contract['body_sha256']
                    assert [note['number'] for note in scope['translator_notes']] == contract['note_numbers']
                    assert digest(compact(scope['translator_notes'])) == contract['notes_sha256']
                    assert all('[Note '+str(n)+']' not in data['text'] for n in contract['note_numbers'])
                else:
                    assert name not in data
            assert 'publisher_divisions' not in data, 'No publisher recitation marker exists in this chapter'

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
            metadata = {uid: tool('get_text', {'uid': uid, 'limit': 200}) for uid in rows if uid in historical_ids}
            assert not ledger.exists(), 'Metadata automatically retrieved English'
            for uid, meta in metadata.items():
                if uid in BASELINE_ROOT_SEGMENTS:
                    assert digest(compact([{'ref': seg['ref'], 'type': seg['type'], 'text': seg['text']} for seg in meta['segments']])) == BASELINE_ROOT_SEGMENTS[uid], uid + ': previous Pāli segments changed'
                assert len(meta['english_available']) == 1
                choice = meta['english_available'][0]
                assert choice['translation_id'] == version(uid) and choice['translation_revision'] == commit
                assert choice['license'] == 'CC BY-NC-SA 4.0' and choice['url'] == rows[uid]['url']
                if uid in NEW_IDS:
                    assert choice.get('chapter_summary') == (SUMMARY if uid == 'thi-ap40' else None)
                    assert choice.get('collection_summary') == (COLLECTION if uid == 'thi-ap40' else None)
                    assert choice.get('publisher_preface') == (PREFACE if uid == 'thi-ap31' else None)
                    assert choice.get('publisher_divisions') is None
                if uid in tuple('thi-ap'+str(n) for n in range(33,38)):
                    assert meta['source']['locator_revision'] == manifest['vri_commit'] + '-apadana-theri31-40-v1'
                if uid in STABLE_NEIGHBORS:
                    assert digest(compact([{'ref': seg['ref'], 'type': seg['type'], 'text': seg['text']} for seg in meta['segments']])) == STABLE_NEIGHBORS[uid]['pali']
                    assert meta['source'].get('locator_revision', manifest['vri_commit']) == manifest['vri_commit']
            assert len(BASELINE_ROOT_SEGMENTS) == 30, 'Missing frozen pre-change Pāli baseline'
            for uid in NEW_IDS:
                foreign = next(candidate for candidate in NEW_IDS if candidate != uid)
                for request in ({'uid': uid, 'translation': version(foreign)},
                                {'uid': uid, 'translation': version(uid), 'translation_revision': '0' * 40},
                                {'uid': uid, 'translation': version(uid), 'offset': 1, 'prefix_sha256': '0' * 64}):
                    assert rpc('get_translation', request).get('isError'), 'Unsafe owner/revision request accepted'
            assert not ledger.exists(), 'Invalid source identity fetched publisher bytes'
            checks.append({'check': 'All40 choices explicit; original30 descriptors and Pāli ref/type/text sequences frozen; changed33–37 locators; unaffected31/32/38 stable; foreign owners/revisions/prefixes refuse before fetch'})
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
                assert len(pieces) > 1
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
            excluded = [('thi-ap31', 'publisher preface', whole['thi-ap31']['publisher_paratext']),
                        ('thi-ap31', 'preface-only note1', whole['thi-ap31']['publisher_preface']['translator_notes'][0]['text'])]
            for name in ('chapter_summary', 'collection_summary'):
                excluded.append(('thi-ap40', name, whole['thi-ap40'][name]['text'].split('\n\n')[1]))
                excluded.extend(('thi-ap40', name + ' note' + str(n['number']), n['text']) for n in whole['thi-ap40'][name]['translator_notes'])
            excluded.extend((uid, 'publisher colophon', part) for uid in NEW_IDS for part in whole[uid]['text'].split('\n\n')[-2:])
            for uid, label, quote in excluded:
                result = tool('verify_quote', {'text': quote, 'language': 'english', 'texts': [uid], 'translation_ids': [version(uid)]})
                assert result['verdict'] == 'not_found_in_scope', label + ': editorial/summary wording misowned as poem'
            checks.append({'check': 'Every printed stanza label in all10 poems is quotation-positive; preface/note1/chapter/collection summaries/owned notes/colophons remain excluded'})
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            old = [{'uid': 'thi-ap' + str(n), 'title': 'Authentic pre-repair thi-ap' + str(n) + '/' + str(ref),
                                    'ref': 'thi-ap' + str(n) + '/' + str(ref), 'offset': ref - 1,
                                    'source_commit': manifest['vri_commit'], 'note': PRIVATE + ' saved ' + str(n) + '/' + str(ref)}
                                   for n, ref in [(n,ref) for n in range(33,38) for ref in (1,LEGACY_LAST['thi-ap'+str(n)])]]
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
                                    notes = page.get_by_role('region', name='Translator’s notes', exact=True)
                                    assert [item.get_attribute('value') for item in notes.locator('li').all()] == [str(n) for n in EXPECTED[uid]['notes']]
                                    assert digest(compact([{'number': int(item.get_attribute('value')), 'text': item.locator('p').text_content()} for item in notes.locator('li').all()])) == rows[uid]['notes_sha256']
                                    preface = page.get_by_role('region', name='Publisher preface · editorial, not poem text', exact=True)
                                    if uid == 'thi-ap31':
                                        expect(preface).to_have_count(1)
                                        preface.get_by_role('heading', name='Fourth Therī chapter preface · editorial, not poem text', exact=True).wait_for()
                                        assert digest(preface.locator('.translation').text_content()) == PREFACE['body_sha256']
                                        assert [item.get_attribute('value') for item in preface.locator('li').all()] == ['1']
                                        assert digest(compact([{'number':1,'text':preface.locator('li p').text_content()}])) == PREFACE['notes_sha256']
                                        preface.get_by_role('heading', name='Preface notes · editorial, not poem notes', exact=True).wait_for()
                                        assert '[Note 1]' not in body.text_content()
                                    else:
                                        expect(preface).to_have_count(0)
                                    for scope_name, label, contract in (
                                            ('chapter_summary', 'Canonical chapter summary · not poem text', SUMMARY),
                                            ('collection_summary', 'Canonical collection summary · not poem text', COLLECTION)):
                                        scope = page.get_by_role('region', name=label, exact=True)
                                        if uid == 'thi-ap40':
                                            expect(scope).to_have_count(1)
                                            assert digest(scope.locator('.translation').text_content()) == contract['body_sha256']
                                            assert [item.get_attribute('value') for item in scope.locator('li').all()] == [str(n) for n in contract['note_numbers']]
                                            assert digest(compact([{'number':int(item.get_attribute('value')),'text':item.locator('p').text_content()} for item in scope.locator('li').all()])) == contract['notes_sha256']
                                            assert all('[Note '+str(n)+']' not in body.text_content() for n in contract['note_numbers'])
                                        else:
                                            expect(scope).to_have_count(0)
                                    expect(page.get_by_role('region', name='Publisher recitation division · not poem text', exact=True)).to_have_count(0)
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
                            for uid, label, patch in (
                                    ('thi-ap40', 'revision', {'translation_revision':'0'*40}),
                                    ('thi-ap40', 'owner', {'text_id':'thi-ap39'}),
                                    ('thi-ap40', 'raw source', {'raw_sha256':'0'*64}),
                                    ('thi-ap40', 'terms', {'license':'CC BY 4.0'}),
                                    ('thi-ap40', 'poem-note ownership', {'translator_notes':whole['thi-ap40']['translator_notes']+whole['thi-ap40']['chapter_summary']['translator_notes']}),
                                    ('thi-ap40', 'missing chapter summary', {'chapter_summary':None}),
                                    ('thi-ap40', 'chapter summary owner', {'chapter_summary':{**whole['thi-ap40']['chapter_summary'],'parent_id':'thi-ap39'}}),
                                    ('thi-ap40', 'chapter summary root', {'chapter_summary':{**whole['thi-ap40']['chapter_summary'],'root_sha256':'0'*64}}),
                                    ('thi-ap40', 'chapter note ownership', {'chapter_summary':{**whole['thi-ap40']['chapter_summary'],'translator_notes':[]}}),
                                    ('thi-ap40', 'missing collection summary', {'collection_summary':None}),
                                    ('thi-ap40', 'collection owner', {'collection_summary':{**whole['thi-ap40']['collection_summary'],'parent_id':'thi-ap39'}}),
                                    ('thi-ap40', 'collection root', {'collection_summary':{**whole['thi-ap40']['collection_summary'],'root_sha256':'0'*64}}),
                                    ('thi-ap40', 'collection note ownership', {'collection_summary':{**whole['thi-ap40']['collection_summary'],'translator_notes':whole['thi-ap40']['chapter_summary']['translator_notes']}}),
                                    ('thi-ap31', 'missing preface descriptor', {'publisher_preface':None}),
                                    ('thi-ap31', 'preface owner', {'publisher_preface':{**whole['thi-ap31']['publisher_preface'],'parent_id':'thi-ap32'}}),
                                    ('thi-ap31', 'preface note misowned as poem', {'translator_notes':whole['thi-ap31']['translator_notes']+whole['thi-ap31']['publisher_preface']['translator_notes']}),
                                    ('thi-ap31', 'preface note ownership', {'publisher_preface':{**whole['thi-ap31']['publisher_preface'],'translator_notes':[]}}),
                                    ('thi-ap31', 'duplicated preface wording', {'publisher_preface':{**whole['thi-ap31']['publisher_preface'],'text':whole['thi-ap31']['publisher_paratext']}}),
                                    ('thi-ap35', 'invented recitation', {'publisher_divisions':[{**rows['thi-ap28']['publisher_divisions'][0],'text':whole['thi-ap31']['publisher_paratext'],'translator_notes':[]}]})):
                                page.goto(base + '/#read?uid=' + uid)
                                state['drift'] = patch
                                choose(uid)
                                expect(page.get_by_role('button', name='Retry selected source', exact=True)).to_be_visible()
                                expect(page.locator('#study .translation')).to_have_count(0)
                                audit('refused ' + label)
                            state['drift'] = None
                            for item in old:
                                saved(page, base)
                                bookmark_link(page, item).focus()
                                page.keyboard.press('Enter')
                                page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                assert page.locator('.passage').count() == 0
                                assert 'source or citation mapping revision changed' in page.locator('#view').inner_text()
                                assert PRIVATE_MARKER not in page.locator('#view').inner_text()
                                audit('authentic pre-repair refusal ' + item['ref'])
                                review = page.get_by_role('link', name='Review current source at this reference', exact=True)
                                review.focus()
                                page.keyboard.press('Enter')
                                if item['ref'] in ('thi-ap33/30','thi-ap36/30'):
                                    page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                    assert page.locator('.passage').count() == 0
                                else:
                                    page.locator('.passage').first.wait_for()
                                    loaded(page)
                                    assert page.locator('.segment-label a').first.inner_text() == item['ref']
                                    assert 'source=' not in page.url
                                audit('explicit current review ' + item['ref'])
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
                            for fresh_uid in ('thi-ap35','thi-ap37'):
                                page.goto(base + '/#read?uid=' + fresh_uid)
                                segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                                segment.wait_for()
                                segment.get_by_role('button', name='Save passage '+fresh_uid+'/2', exact=True).click()
                                fresh = profile(page)['saved'][-1]
                                assert fresh['ref'] == fresh_uid+'/2' and fresh['offset'] == 1
                                assert fresh['source_commit'] == manifest['vri_commit'] + '-apadana-theri31-40-v1'
                                saved(page, base)
                                bookmark_link(page, fresh).focus()
                                page.keyboard.press('Enter')
                                page.locator('.passage').first.wait_for()
                                loaded(page)
                                assert page.locator('.segment-label a').first.inner_text() == fresh['ref']
                                assert page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text() == metadata[fresh_uid]['segments'][1]['text']
                                audit('fresh revision-pinned bookmark roundtrip ' + fresh_uid)
                            checks.append({'width':width,'theme':theme,'check':'All10 explicit sources; exact wording/notes; distinct31preface/40chapter+collection;19drift refusals; old33–37 saved locators with vanished33/36tails; private draft/export; fresh35/37 bookmarks'})
                            context.close()
                    browser.close()
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(event['ok'] for event in events)
            assert {event['url'] for event in events} == {rows[uid]['raw_url'] for uid in NEW_IDS}
            report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'publisher_revision': commit,
                      'previous_metadata_baseline': '2e3d6c4', 'previous_metadata_preserved': len(BASELINE), 'previous_pali_roots_preserved': len(BASELINE_ROOT_SEGMENTS),
                      'publisher_preface':PREFACE, 'chapter_summary':SUMMARY, 'collection_summary':COLLECTION,
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
                if re.fullmatch(r'thi-ap\d+', str(scope.get('uid', ''))): context['uid'] = scope['uid']
                if isinstance(scope.get('index'), int): context['paragraph_index'] = scope['index']
            trace = trace.tb_next
        print(json.dumps({'passed': False, 'error_type': type(error).__name__,
                          'failure_at': {'file': Path(__file__).name, 'line': frame.lineno if frame else None}, 'context': context,
                          'limits': 'Failure detail redacted to protect publisher wording, translator notes and private drafts.'}), file=sys.stderr)
        sys.exit(1)
