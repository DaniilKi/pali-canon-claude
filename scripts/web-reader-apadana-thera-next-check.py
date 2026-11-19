#!/usr/bin/env python3
"""Actual MCP/browser checks for the ten reviewed next Therā publisher chapter Apadāna additions; pinned local bytes only."""
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
from web_reader_apadana_thera_next_navigation import install_navigation_timing_probe, open_chapter_summary

ROOT = Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_APADANA_THERA_NEXT_ā😀'
PRIVATE_MARKER = 'PRIVATE_APADANA_THERA_NEXT'
MAPPING = {'tha-ap33': 31,
 'tha-ap34': 32,
 'tha-ap35': 33,
 'tha-ap36': 34,
 'tha-ap37': 35,
 'tha-ap38': 36,
 'tha-ap39': 37,
 'tha-ap40': 38,
 'tha-ap41': 39,
 'tha-ap42': 40}
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
 'thi-ap40': '4fa75689160b1e45984c0da9a6f97bf81116c199407b7de89b1aab063de97547',
 'tha-ap13': '3417b212ea9686293d161ea3ddb79082a448e3bf2c2f7b3940741bdd356f153d',
 'tha-ap14': '6e6a45d5a6bcdcdd8bc4bad9fd091de7c357bcab1e6ada1689406ad632efa918',
 'tha-ap15': '827e4b360834423eedef9db723a5a5c4410e005fb5e4acca312931f696c021a7',
 'tha-ap16': '56b21208bbe0f20c2f86621e57156f66966097c2f7f3bae7191e05210f4819df',
 'tha-ap17': '8c00cfe55fc2a77ebeccca735c39d5b4cc0caa04b292a3714f7a185e9bce45cc',
 'tha-ap18': '26fcb8d883045224446059f12464545cbda37a32a4a55aa23e3ae90934d95291',
 'tha-ap19': '9810b960c391b19e055c77ef09d049231eb3c308a1920c9a89e033aba8876e9d',
 'tha-ap20': '895573a48b86bcc78feab956b1d7f6777dbbb9d7ec5b01421749427d99d75326',
 'tha-ap21': '559160291ec72982003402ed01327d1715d93b6db0cd2f7dc96144623985406c',
 'tha-ap22': 'e5668b151117d727ee20b897bc9b6f5f4cd733e661ee130d08e827b9d62e1293',
 'tha-ap23': '08bf019320a7e65efe3d27c8a97a4c07ad9b3ecbc8cd5c9c13ec7d5b2b90d9d1',
 'tha-ap24': '373b2c1e3e60471b536703a5e47ccad204f18ae813207f2b520fe1810499ae0c',
 'tha-ap25': '835d30b7e920376c39e666610ac84c493d7cb8c89e0f7b5d04077f5a4ac1e8ff',
 'tha-ap26': 'e1e3296691b538729cada09af8331f37cbc34593e866add15b6d73c3eaedf989',
 'tha-ap27': '9f407757f44ad0b8fda7304f8173fe7eaf002bbdd6bcd7dd97f28f3a9577ed50',
 'tha-ap28': '8cde733c0a1c63793d361f0d2acc51556b86740e98db90e15c90f8c55cebee9b',
 'tha-ap29': '2c2a8361be3bb944db751d1e5c37d846afeee1bce7ee3614ccdeeb993d044e1b',
 'tha-ap30': '0dd53480d6ac9dc97d263b5687206febcc4fea3dee77497673841f5510559a0b',
 'tha-ap31': '069dfe88e4b6b7413c690f58d8c9eb345ad385edabd2d27a2466721e688ab18b',
 'tha-ap32': '01fc4d83178c1bff91a52a2d6dabaeb723ce1ee49a22ff66ece1a111f33326dd'}
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
 'thi-ap40': '8da1e22584378b89065a8ef2896f1500f95ebdd4084b5b4abeef1b36099e316a',
 'tha-ap13': '78de6eef88583b31baafc14d7e13123343b4f6d59d6c50d41a837313d97cd9e1',
 'tha-ap14': '93c25d5afdb68a329e9b4400ba3560d7155f503b3b32e9b373e1ed51c311d7db',
 'tha-ap15': 'afe422df7d1257998b70101853d1a48912af3586e87dd8e0ca28dc6aa10840d2',
 'tha-ap16': '9a57d915a4cd4b6df079e0816af175e63d4358c6304962312124d2da24d63447',
 'tha-ap17': '6c8dc2cc576108c35a2c5769573ec5ac59bd5e71e2a123eed3d7a906a0524a68',
 'tha-ap18': 'b9be4c7975efd5b33b3d39ba0c74a152a403d5102781a6bb4ceb02c0ad783e08',
 'tha-ap19': '140334f054c24177e2411e0fe23acbbeb7733bd38f860e48b96e1767212e69f8',
 'tha-ap20': '3af0984e8c81192663f25ac085b33c2d8e684df48cf0e9442b075beca1c990c0',
 'tha-ap21': '0256222033001db2382ac98c130abba8d94e39da105651ec39494f7bbc7f2ff9',
 'tha-ap22': 'e284f78140d9d0d22110a3035bb8e9493db25ae29030278d98071eb8a5a6e335',
 'tha-ap23': 'bc48fe42df85ec25954ab5ecb32aa6da897aca6840c701b0b8ae35cfd546836e',
 'tha-ap24': 'd63f82311967adcd2d0b09ea6ec144e1cf3acf62163ee6b59e1d64dcea1f773e',
 'tha-ap25': '3663aa4dd6a79ff2913b5066ec16a25ada49a28b898caee9e156ae4f0570c62e',
 'tha-ap26': 'aa806c7bcd87b2b203537f2e7f47c5c3ae465c327310c93ab32c0490cea56f6e',
 'tha-ap27': '6e8cf9d909fe03e567618426bb9414f64d27479c3324fdf6f52091e52612f838',
 'tha-ap28': '8b421e635ed4724f3212567093f6b35ead427085979619965b82c31dccef80b8',
 'tha-ap29': '1b9ce2f220bac3f2916b382d0a8ef744012cc56b95b979757368d0a17a36b8aa',
 'tha-ap30': '49830176326663d6cd5e21580942a203395e070ba0f4010c02f2c3ce1d5c3ae9',
 'tha-ap31': 'e24b649e41bbc257d5ba3e4df8e50626a95862a41d6e76b50ff9019e9fbaf212',
 'tha-ap32': 'bfae31395753145fee29216f9bc8c2eb0aee1a10b4195a98177f4bbb2560b515'}
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
 'thi-ap40': '11b0e1cdd6cf1e7a2a6ce18685ae10e379eb3a5c14f1bc12ecff4d375afa8cb7',
 'tha-ap13': 'a1fcc555de972cb93441a213eda4956c92c658525e0f62eb683da12d49e6d309',
 'tha-ap14': '5e23d5073325206c266a286964567c4f80e147041996d94ff159a6c39feb5922',
 'tha-ap15': 'a1457256d7d8794fc13f14453d85d8fc5b3ae252201eb711bdf9936181f04bdb',
 'tha-ap16': '3e6661e472fda391912174b8ee664a5b3c9357f1e61b2270dd460f3657e19ef2',
 'tha-ap17': 'ce89e0569c3d0fa12c63ddabdf951749f72afb09654d54c81499c1d9dcfbd156',
 'tha-ap18': '52046c0437f869b878945147b367ddcac4bb13e86f409da49a756c22a72ac91e',
 'tha-ap19': '874433cd75f725fb829b3ed4cdf56512afca84a4a8a2ee4e7d92d39d10a24c10',
 'tha-ap20': '1a7f07b84571c102f3057e60ba426102f33acf340b3cd31dc2b556f6e1056047',
 'tha-ap21': 'a1fcf14b085c95f1db30386301427885eee12502c7b39e06f96931950ab6ddf2',
 'tha-ap22': 'ba5390b37fd30fb0586fc45d9713c32714c7560d6c658d12a9c2e183c1c06a62',
 'tha-ap23': '5a34110928789a1a95073ffc672aa108d83d9b0f6ec10aa79a50ae937e90fca3',
 'tha-ap24': '035bb447d63a89443b076e28a919fc94b66e895862d07888aecad118c24543fb',
 'tha-ap25': '30b4e096e3b18c0fcb9169355e1dfbaf1c07a32bdb54f045581db57b219f02de',
 'tha-ap26': 'db2ce5f45d2b6b6088d5ad67c26056222d2d59b5f0c3f444906cc979803eeb95',
 'tha-ap27': '4a4617ee0da273ba217a9d9ff0fb03d1b7ed2cee8f3c5b48e6c0726cd81f980a',
 'tha-ap28': 'ff7a16d150f91912ad7b4e559df0e6c6f01f5375cb4dba3b6adcbc2585f11989',
 'tha-ap29': 'b9da55baf69cedd99f41cd580546409f125a85e1e2d2ad951a85abe3f202b3b8',
 'tha-ap30': 'e9529ffff1b8fc7da01a64f136c3edfd2e48559dd0ca865bae527e148b5351cb',
 'tha-ap31': '93cd956036f0dbad386bd7642a0fbc7f48384b87b85ea25915ae0418b5bd3475',
 'tha-ap32': 'f8f3bb6a3a5c97605c48ce82ff46e60e49e009093060d8aba8cbd43c8ce40b38'}
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
# Independent exact artifact goldens. Semantic approval and final runtime readiness remain separate.
SOURCE_GOLDENS_SHA256 = '179000f196cd283092ac3d4a219a64b8f79596b4e9d8a7f34bbb4ddf806d9728'
EXPECTED = {'tha-ap33': {'raw_sha256': 'c39814a0380c0fecfcff008d82fb974da05e0d42ed3b89d27ebec4dad9c2aa52',
              'body_sha256': 'f6c3421136f58b305ceae3c64fd6276eadd4f919790dcd1efdd5205ea9f2e085',
              'notes_sha256': '970dc75576e71d288e0441a675bbb4ec5b349e32835ff22e068ca94ac1e85309',
              'paratext_sha256': '813f2c5ac30a57a905a8c08924d40c74191561cf05a91aedc484bea30c6bc804',
              'title': 'Kuṇḍadhāna',
              'root_sha256': 'a2e709190addc8bdab51e7f6e672ae73993a930b60b35020593cedcdf2b793bb',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9],
              'layout': [{'local_label': '1', 'publisher_label': '1003', 'suffix': '(1) [1003]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1004', 'suffix': '(2) [1004]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1005', 'suffix': '(3) [1005]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1006', 'suffix': '(4) [1006]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1007', 'suffix': '(5) [1007]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1008', 'suffix': '(6) [1008]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1009', 'suffix': '(7) [1009]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1010', 'suffix': '(8) [1010]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1011', 'suffix': '(9) [1011]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1012', 'suffix': '(10) [1012]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1013', 'suffix': '(11) [1013]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1014', 'suffix': '(12) [1014]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1015', 'suffix': '(13) [1015]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1016', 'suffix': '(14) [1016]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1017', 'suffix': '(15) [1017]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1018', 'suffix': '(16) [1018]', 'lines': 4}],
              'paragraph_hashes': ['6b6e99bfb2fda42293480d8687ab3bec6c9be4b4eb72d5279c1dad5ffe0bc867',
                                   '97edfc134ad780d10a603fd6ea6184064f0a069667bc6c311312d79addb1ac39',
                                   '9d9736861a7ec1e451378f74d4159548f8d17f4c9fca48bbf680d073e0a5c0f0',
                                   '9ab5fe9edeb94c75a13f8fe54d7a95241703be8b6b6f10ce56a0cc42b51d8e47',
                                   '218bf5ca0dcb7cf6615e387739939103aa37d1df72f846e47da2568c4375fb1b',
                                   '6e97d39378a45e7563f9496c41134fd7bb35b77bd64b17e64e9d844691f8470b',
                                   '18fdb3c050eb610a0059978956f65de98fc9f5dc5b20cd473e99bc30e69b1d53',
                                   'cefbd73e0b22c846d550fce3cc849824ffc32b8a376dcd99ca8a6f814b0d0de1',
                                   '9a7c740be329b46d4e8a1f13a813e271f835e238e32f2f49d50a76309839930f',
                                   '8c3f856522f6c5cc97469ab8dcd1a9366ac0278d4ead926aed12ccbb733710f0',
                                   'd5aefeefcace1ad098ccbe4c6700a162ce6f14a527c9419b368f2e06feb2b739',
                                   'ebcf8e17a541c4aac42ac5894511147a52e22d403af11513d708311b3cc65abe',
                                   '8884c9d121dac94c4cfa4fed4a7a214616b5ff5130288a243ebe10c6263cac7d',
                                   '54a5b76d31d337e5da657f096b88483c39cf73c366d7c16cc54cff865a890a89',
                                   'e694075c98c629cdf270e867237b600b74eda011c7a008a304a535397747f447',
                                   '8025ba62b3f5d970b73196c51be63fd5547c92f25f3b4ecdfc888313decbfaf6',
                                   '59e5374087bd896ace9b1b1066810106f2e33b2d80528ad3b35205a80284e247',
                                   '2197fcb94b87bf31c714445e72bf5e70e5d24bb40ea6df9a76b72919670689f4',
                                   '08f588011e300a3b6056ddb5c040a974edf0cba2b124489943fe458a0920ff21']},
 'tha-ap34': {'raw_sha256': '93eedb1290d7723f70a67e3ac279f9602cb8e925a274f19db718f1f1d415c489',
              'body_sha256': '45f1fffbb4d7fded74efd9d5612f7cef2aaff94843ad46599e1b207708206294',
              'notes_sha256': 'e16f2cf8423a50967c7d4e717dbd76ec6cb4c64a9d67420e86f692772ff05ebf',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Sāgata',
              'root_sha256': '59e0d234216c6afa202cf9620a2df27847ef5ff0321402f111021e1408e3c463',
              'notes': [1, 2, 3, 4, 5, 6],
              'layout': [{'local_label': '1', 'publisher_label': '1019', 'suffix': '(1) [1019]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1020', 'suffix': '(2) [1020]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1021', 'suffix': '(3) [1021]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1022', 'suffix': '(4) [1022]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1023', 'suffix': '(5) [1023]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1024', 'suffix': '(6) [1024]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1025', 'suffix': '(7) [1025]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1026', 'suffix': '(8) [1026]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1027', 'suffix': '(9) [1027]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1028', 'suffix': '(10) [1028]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1029', 'suffix': '(11) [1029]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1030', 'suffix': '(12) [1030]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1031', 'suffix': '(13) [1031]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1032', 'suffix': '(14) [1032]', 'lines': 4}],
              'paragraph_hashes': ['d340936374662954c59a6564efb6c80b83ffb6be02a1511f56fa994a9e4d3dd6',
                                   'ff83e1def278fd366b2168471ecbe18f72c762ad6507e519f25c3868c6ce53c3',
                                   'de0e76313fbbe8f253f816d30f996980fbd773507872e2c36a8b0258336fd198',
                                   '1c973b5aaf1c727531cde37a59c6c8559316e8f1718aa18ed308c80fd95ff349',
                                   'dfbc3497ef847539b7fec432ae4c7c3b519c8d4d5eab8d01e1e947fa00c080f4',
                                   '3c05162345f15229937dbe33268761dbb4416ac97bf5768b2437cb66933706ac',
                                   'cb46d4d1b9894c53e86697393c4a4eb85cbca8cda93f622ac62850fbb470cd19',
                                   'e965456a6395508fc73415f65a58fa46d5ac7e4928abb492eb6b3a9dabae6e3d',
                                   '74cc8921793de5d473f370161697a425d9b746f497f4d8fc73c627804efc5cc2',
                                   '55eaf043d59e1136b0e6ea46514ad0dab81ed9eaab5b969755566246c6aac82d',
                                   '6f2f629550513a644aea2a44a071f6262a13aba41471d195b8c7e4aef791e9f1',
                                   '7ad9dfbb9a76f6a65559ed6ef22b906995f2d4533ab76b40eaf9dc252aa13e25',
                                   '2307b9668232e3bcf2c461b43549a3c3ec3d87ff302cb4db488813cd7f6ffbdf',
                                   '4f25cd42457005c34c5778b8cec6f8d3a36556986175695a99bbf1575e836aaf',
                                   'db9f585ff7b2dbe0c759b8b637c5fb143de4026285b0ee582771907101bd91fd',
                                   'f5d37896e50b5ebc1b12aa7bfc4ddbd75d9dc9122df18084730012c321709cdd',
                                   '38e71bd6ff5be03d17e8aec338d8fae80d94205640fdcb90747bb1c6c7afd0a1']},
 'tha-ap35': {'raw_sha256': '52d0654c4dfd6bdc447bc2de4833238bb65ac769573743bc80fb15bcf097b580',
              'body_sha256': '11cc04b90fa9a642de91ade4ae3daa41bcc713564b93617117d5c913e3e07b48',
              'notes_sha256': '664c305df5ee49ad556636a271b6b8db95d1a686b367a1b9e554dfdb2ff85c84',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Mahā-Kaccāna',
              'root_sha256': 'd5f545ad65a179119379c99593230aa303e64b667da4850a553ef29b0813bc9a',
              'notes': [1, 2, 3, 4, 5],
              'layout': [{'local_label': '1', 'publisher_label': '1033', 'suffix': '(1) [1033]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1034', 'suffix': '(2) [1034]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1035', 'suffix': '(3) [1035]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1036', 'suffix': '(4) [1036]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1037', 'suffix': '(5) [1037]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1038', 'suffix': '(6) [1038]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1039', 'suffix': '(7) [1039]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1040', 'suffix': '(8) [1040]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1041', 'suffix': '(9) [1041]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1042', 'suffix': '(10) [1042]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1043', 'suffix': '(11) [1043]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1044', 'suffix': '(12) [1044]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1045', 'suffix': '(13) [1045]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1046', 'suffix': '(14) [1046]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1047', 'suffix': '(15) [1047]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1048', 'suffix': '(16) [1048]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1049', 'suffix': '(17) [1049]', 'lines': 4}],
              'paragraph_hashes': ['8dfa28f7b8da7eb8a0f73b790e4d9e828a21eebbb005084909061475930619fb',
                                   'a31c0d1539be1bb7a3fd95a0a97f0d9cc676b90bdde534c91da6ac32d3149d84',
                                   '59ea3b91f6e8bca262c4eda539910a9574e94f0a758e2ba2cf79646281d97fa0',
                                   '99ec78d065ace36d6244cd06d85bc7384d3a09a06bbabe3d00991e7572c5b93b',
                                   'bd72e969aa43888653ce5ab1ab781e31a082c2ce9c42429637f2e777699e9150',
                                   '9fdffa84efeaf8aa71cff45569ea54e490dca162cd5d2dbc04448d1e5cc96f1a',
                                   'f20b75d346349105aa0bd9a4473c5da407ece6249e74a46ea8ab164185daac9a',
                                   '214e10e819812ccde6274ce2a236deceb8d790e9e0fde3368dfa5fc6e32b5f4f',
                                   '272dae311db15037cee44b49befb2630021c6ec293445b4babf0a3f5a58dd325',
                                   'fc3ee2b2e48f029749fa6c709fdf1fa4032c4907ee88e2ded5a663695d442ddb',
                                   '947417db6ada46fcf201fb2a485a3bf3df0e660e9d7dbed1a2eea789c9b0f659',
                                   '59380a9d3cf2fcb22d4649c47de325f5933c11e27d38b882654db22d74742154',
                                   'e044563b24c9a4d14cd2d07a260e118bf1291c1afa4d7e82fe14b675bae9a60d',
                                   '0eb29bd2eb5ff66f9346ed8f40ca2dae8a66c62fcb8753e47b0402e54c745118',
                                   '581dd6f3448eb32fe1d40cd1ee99070b7db35914c4298209ef4f8004d5a06b1b',
                                   '9f10c29b98bd4687b354895221aac64edbae23f9ae74e0ed391ee202a4d1f492',
                                   '5e46ae33c67b248e59094dd0f894363c91d60fb681e904e8462f6ff3ee9e7fe9',
                                   'f40a7c8dab0c58cebf07f2686824e6a1a2ea4e8f7da113b11388a18f8bcaecea',
                                   '1edcf4af4040cbbbbfed80b60fef2a95edbfd093f736df24d694899d3add5473',
                                   '4e9dd8bd8d20bd61c674d02a88f686f8d9003a998ae7de05f5b5c384f83073b9']},
 'tha-ap36': {'raw_sha256': '96855e450d10314f35ff684566f92a48b56602b7087fa3d1e23340baafd77e66',
              'body_sha256': '5285c73f4da2d896ea40ce23425f1b2875b60d7812422e96beb397933a60d148',
              'notes_sha256': 'aacde100f0aabb66ac333bb533b7414e27cb1646bd6eac1f0c5a6bc24735c9f2',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Kāḷudāyi',
              'root_sha256': '144885319e5d33206b9d8956bdbceb28afea335a428e375ee461fa1d2b289220',
              'notes': [1, 2, 3, 4, 5, 6],
              'layout': [{'local_label': '1-2',
                          'publisher_label': '1050-1051',
                          'suffix': '(1-2) [1050-1051]',
                          'lines': 8},
                         {'local_label': '3', 'publisher_label': '1052', 'suffix': '(3) [1052]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1053', 'suffix': '(4) [1053]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1054', 'suffix': '(5) [1054]', 'lines': 4},
                         {'local_label': '6-7',
                          'publisher_label': '1055-1056',
                          'suffix': '(6-7) [1055-1056]',
                          'lines': 8},
                         {'local_label': '8', 'publisher_label': '1057', 'suffix': '(8) [1057]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1058', 'suffix': '(9) [1058]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1059', 'suffix': '(10) [1059]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1060', 'suffix': '(11) [1060]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1061', 'suffix': '(12) [1061]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1062', 'suffix': '(13) [1062]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1063', 'suffix': '(14) [1063]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1064', 'suffix': '(15) [1064]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1065', 'suffix': '(16) [1065]', 'lines': 4}],
              'paragraph_hashes': ['42f05ccd84e4caa4780ee16fcb891dfd9db3152158120b9b89b5366448f2a7d4',
                                   '5c3f3ab6ce8f763c8b013a91d472f78c012d97fbbf93191e64f1652148750a39',
                                   '639d4bde2f80023e34805dd7fdf2af1a65e9a20b6bb54efce9bd07ee4eb01142',
                                   '66c7d2a8bf9d5e147824e92f2c66be85586573efd39bb33de41c4471e88d33aa',
                                   '3604c2897ac333ecb74560b81b757a1d1e9c7c54ee8fb8cda4583f4263792159',
                                   '7d67dcf77390527b7086c2ff7ec1df5a91906f65a61f0550a6d10ac69ccf889f',
                                   '757b5c19fe523140f538c316c22c705ecb61c857685cec9da697b9d1e3b53508',
                                   '7717b9bc74ef82c291a0f1db0965e41c811c43ac0ac58404784273a48e20545f',
                                   '532e9d762bae99e82eb7208540170d913e2ef084fa0aff496732c50dcf633c51',
                                   'd16d6c33f9f0b2020c83c1588d8c6b42320ab6714d8f2ccbedada55a2f4a1d1d',
                                   'bb5c7f2fe63f8aa4b470369c115df0bcfe204c11230c11b48c895ab07921a70d',
                                   'bea7d8d85439c11f1e59806e1e9d4f31b0dfed2380766a62a2cbe3e75c3d6a95',
                                   'ba3667d98d33b9ec11a4ac7ae0d905711d109f653d22aa39863fb1c8ea4d97aa',
                                   '00943415bf3dac66d6b11635f99865e46096fa839f3ce7a9bcc58ae435ce1e39',
                                   '799da22a391442bf023118a8f335f5c51a4faafb1f72fad2af50db76357c9bb7',
                                   'bd5e1708b19f56a3c7b14b47f0578c2782b290fd1319d0bd94e4012621c0ed90',
                                   'fd11b141de55057dbbd4aa110d551badb6700c3ff06d626a481ba8e778c704a8']},
 'tha-ap37': {'raw_sha256': '90aea3a41cb686cdf5fc5094d5ba82ed5205beb65050adf3450f9eadf9d41e0c',
              'body_sha256': 'ecdb2de97124d65a642044f8d3d8f4b831d235fd4b1ffb149f7a97ec961e6aff',
              'notes_sha256': 'e6d0ac58b9172c9eff0b5db636f9246cc90188c10947fc7c5087417b33bca68d',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Mogharāja',
              'root_sha256': 'a6d55ded5621edf20719f60fdd071e5608d2b818d88c8d140e90e80b5ba4ab0b',
              'notes': [1, 2, 3, 4, 5, 6, 7],
              'layout': [{'local_label': '1', 'publisher_label': '1066', 'suffix': '(1) [1066]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1067', 'suffix': '(2) [1067]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1068', 'suffix': '(3) [1068]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1069', 'suffix': '(4) [1069]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1070', 'suffix': '(5) [1070]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1071', 'suffix': '(6) [1071]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1072', 'suffix': '(7) [1072]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1073', 'suffix': '(8) [1073]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1074', 'suffix': '(9) [1074]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1075', 'suffix': '(10) [1075]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1076', 'suffix': '(11) [1076]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1077', 'suffix': '(12) [1077]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1078', 'suffix': '(13) [1078]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1079', 'suffix': '(14) [1079]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1080', 'suffix': '(15) [1080]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1081', 'suffix': '(16) [1081]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1082', 'suffix': '(17) [1082]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1083', 'suffix': '(18) [1083]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1084', 'suffix': '(19) [1084]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1085', 'suffix': '(20) [1085]', 'lines': 4}],
              'paragraph_hashes': ['4ccedc3a7d33c4f90bd590b9ded04ea55ec9e962570edb2ea9b0e4d01100245f',
                                   '32c6cc93a05efeb7002a78f1eb824ac1a006973282b28a5f0b7b23b41ad1505e',
                                   '8276599a7f687c06bc884858800cca446a29a3f962a79782e43679229ab98cc3',
                                   '33bf5c33b4bc5a31aff9720009fa2157f3e1f42ce7a2d8079709e1870ab1b057',
                                   '808d678676c984ca49f60c13f7f326d7fd8c810a3d553ac3dfa2fbcba8670732',
                                   '6a37adbe938bded439c21f2a6e2b7abb759242ef9ed1f04ab89c8da529b3662a',
                                   'd9761b906fd7aad239b5b0ef697933ab8023cb479b08bc90ac3d5c0f85c56609',
                                   '3abb6227aeee7f325024750580752b2d52348db5ef4a9f69f9303fde33bd7342',
                                   '29c8128de4fef0fe61d962e8c27e081536889385011ff2b69353a8689be7de00',
                                   '32e0770444da98819ffb68e272b5d237ae38d554ebb27f91582825ed04c6c376',
                                   'd8e6035de0e09de3e376e84bc567f8da374de49f9563bf6c0b5cc0a08595fe5c',
                                   '293869b14ec71f05a4926e6dc20469af6eba785c31c5d8cc86511172be5413bc',
                                   '7180111124e85ee2acfca66d130eefd16b5a5145eebfccceca0491303ffb6840',
                                   '97aaaf846b583e8ac588d6057edd44bdcdca016a388ac0c17c347f22a142cfc0',
                                   '3d93cdffe43f8b5742ce95d910861ae2b709ef26266959d011843a824902fd83',
                                   '743cb1561f12cb39f9d7f3c9f8870a3a5c712eec957ce04559169a2deb663b48',
                                   '600d888f1103e2a9c531d667fb73825ed732d339d7a837dee06ef8cd884672de',
                                   'd1f28bee1b21087f311d25081647b86c8d3bc95e2177f845c02b4bb14c051c4d',
                                   'f11bc0cd6019db91de898d4416b1983ddebac2d44b264664fd36f5e5a3c1503e',
                                   'ed4dabe03f49ef0127fc363e52cc8951b11c9676ef2be0bb2981ac30967d75b2',
                                   '044a2a5eeb9e0285f0fe2db0f27f19b06baee698c4f111243eca30259e696c52',
                                   '222bea84e767ccc41e5fe21852da0e59b4d8a3e63c2b0f907601e6aa49003493',
                                   'd9979605c17d626b96be02a8b82c3c8fbc5ad4bef5d981b370e282d901725b2b']},
 'tha-ap38': {'raw_sha256': '22d989bcb7cffbcd0a2e41b496a2943938c696f2a4a582e87fadb2e41b44a9df',
              'body_sha256': '6bb46654ad7958ddd5f10daf03558c86d2225231b1f8a9d7728a0c3d31501fac',
              'notes_sha256': 'f76c922e13f69d8fd5eaf9969297cf668dce03f1083a4fd267db78ad57c2e84b',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Adhimutta',
              'root_sha256': '3d66561486606036f2f323806d389a9333a5e2e1018c0622387b0f1aff3f0812',
              'notes': [1, 2, 3],
              'layout': [{'local_label': '1', 'publisher_label': '1086', 'suffix': '(1) [1086]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1087', 'suffix': '(2) [1087]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1088', 'suffix': '(3) [1088]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1089', 'suffix': '(4) [1089]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1090', 'suffix': '(5) [1090]', 'lines': 4}],
              'paragraph_hashes': ['447de3923bf15f8b7275acae7fa75a5a7eb18cd16deefc601653a8da87bef603',
                                   '89472bb1cdba64801a51137bf74b3944e16ff9833480d7f0be19494b641c2126',
                                   '04eec379202741fdef7bc0c8a9c2d543d67f852442c9b69e8da1fca72438b0d2',
                                   '4bcc39c0a94eab043ce6d2afd57e67e6755a771444e08612a1f7c6c3ebc47afa',
                                   '0659eac77c704cea3343bb19f6cf7691d4963efc415b88e997b49b32ed94c8a2',
                                   '8a149ec2bf6206e8d60a49a9a7002d5a1633f38cdd8e65a771b618f8df7a122a',
                                   'e739b89d7770f7b38cbfae8ec520aed6e1f6420c52fafd43577fe2db887c7974',
                                   '60cb77afd11913ebb199d44168543bf79f5d74ad055f761bc91284cffe5b8f52']},
 'tha-ap39': {'raw_sha256': '9d49f8ff17b3321e32e018b182f8e77285f9385a1d8a17862db04a88b678d0e9',
              'body_sha256': 'f8d175bd164c0068a7515dbb6a8c001ae6935ff54580f17c5515c0d4d6b7c06c',
              'notes_sha256': 'c48addcf91b5c798022c187fb1ce2a0af38b0a0c5368f0b94343b1b2b2cc6032',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Lasuṇadāyaka',
              'root_sha256': 'cf495f189a4672ecf7c7f974fff718b3ad018dc9cdda915db103330c73e75980',
              'notes': [1, 2],
              'layout': [{'local_label': '1', 'publisher_label': '1091', 'suffix': '(1) [1091]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1092', 'suffix': '(2) [1092]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1093', 'suffix': '(3) [1093]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1094', 'suffix': '(4) [1094]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1095', 'suffix': '(5) [1095]', 'lines': 4}],
              'paragraph_hashes': ['a0c4fc6845215c0e7cdf0ee45cfd907db7e7626f36327e98869536840c03d58f',
                                   '92de563bcab052f8ab1bb131af9e41502a378ffb79e15eadd47af2c0571cc50e',
                                   'ab0c159aa3db4def11ed4dd4f04520bceeb23c47b9ed3fce37c013e118a5e9da',
                                   'ff814b190d39db7c98a68fe1bb1ba298f2c4abdf07944a65cb916463f95f872c',
                                   'c0c89db921f077eda5328cc92a1049c5ffb07d67120f05c7387d2fc6498294fa',
                                   '8c50053c44350ec88f64a05cfdfa67f08be2fb7280373d4ec64d580772b78522',
                                   '6e6c69bfa9b27e71d7dbe5becc5194253cbf4de425ea5a2ce12bc1a874b11c2c',
                                   '6004474fa0a93911933e15a1e662414b9b19936bf1678b1d2f13a398314f84e6']},
 'tha-ap40': {'raw_sha256': 'a616d088b0885af5565c2c9c4c068507ef958051479e382c3bd085249a22de15',
              'body_sha256': '3c1c0374e5394412c2c730f13da766d046aee083d01c3b70d9204966e8ce836e',
              'notes_sha256': 'b99248fa84c5ddc5702104be9d4207508e44b7dd50757430b8190ddd7b4f340e',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Āyāgadāyaka',
              'root_sha256': '92ac7ac0280a73622d465c032d1c504648db347c48f43752652297587a95bef2',
              'notes': [1, 2, 3, 4],
              'layout': [{'local_label': '1', 'publisher_label': '1096', 'suffix': '(1) [1096]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1097', 'suffix': '(2) [1097]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1098', 'suffix': '(3) [1098]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1099', 'suffix': '(4) [1099]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1100', 'suffix': '(5) [1100]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1101', 'suffix': '(6) [1101]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1102', 'suffix': '(7) [1102]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1103', 'suffix': '(8) [1103]', 'lines': 4}],
              'paragraph_hashes': ['2c7f82d5a5c42d7605d7f26d953d48e5ebf2e2ff072983d566c873b23d0420e7',
                                   'e0cc7e8bccfb9ff0f66105e0deb2cf678db40a465f20ce797c66af3a95eb098a',
                                   '65e8404d394b1a321c85e93d60b4a3424a01c9d1fc148cbad34e4ad6cbb3effe',
                                   '21085705d7d0e379cd4ca9f1e2ebd3ff4dad623afb4907544694664a15a7797f',
                                   'ed5ce0c1ada4eca358bb69982578add3f6e9ed8dbe996091f1d4e384a14cba66',
                                   '54ea3f17a0890b4eea8ee35978dab1ef9a14547d5e0423b503a778b1b0fa18fd',
                                   '58a3038d35f4d097b9e68bd7c86e306f56d7d1424944035a0e68988d310cd92d',
                                   'cfb10570cfbe536e1da58fe6051333391cebbf4b4fa9cb8ebe7575a0b03c8aae',
                                   'd1faa0491f2d9688261a790579f75a49db15f5e17935bf851025ddd44adff3d2',
                                   'f5a2044ee05690cd07a1962baf2501ac711f2e08f8aed04548350d2f2a82f4a2',
                                   '9eb6f49dea68d5f06f78dc00d6f01aeea337493b813f1c1749be02c7d33896bd']},
 'tha-ap41': {'raw_sha256': '1aaf95fbea9965c95ac70fb0e37444fc9baa13a68904e9d97ccb6bd3e8ade08d',
              'body_sha256': 'eea9a4dda596aa760fd9b6d9c156b0910e742946aa22f476f2090aebcae0ad69',
              'notes_sha256': '54d8a4adebee53bde1cf0210fbf31a2ac4e8632bba37e985396d7fa0e35aecee',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Dhammacakkika',
              'root_sha256': '2738e8174780ea0cfe81fe50473cb5c296b0278251cd7a4d002376539c25b4f8',
              'notes': [1, 2, 3, 4, 5, 6],
              'layout': [{'local_label': '1', 'publisher_label': '1104', 'suffix': '(1) [1104]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1105', 'suffix': '(2) [1105]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1106', 'suffix': '(3) [1106]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1107', 'suffix': '(4) [1107]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1108', 'suffix': '(5) [1108]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1109', 'suffix': '(6) [1109]', 'lines': 4}],
              'paragraph_hashes': ['01bbcb25416ebf1d05a96edee354df8bce2ea74f01cae7f849d119686da6a687',
                                   'c3a4d5044a3dc762d58b101e661348499af1d4fea2a5e2d2ec9636c15241cb08',
                                   'f65b51b1b72a5f5c1010abd9ad8b5cff3790fcaff446538005728a020a61ab11',
                                   '4c2e34a492eb7042a3ddb9c1253822456e8eb9231d5542f074954bf19ded6101',
                                   'a785ff08ec2f2d9fb0d89005d30529c378fd538ada074bb7b9ef481e3cd57969',
                                   'f6ee4610dc6d5c31ecc08af9a9881f7c210ccc5e5a3e8781fe0620731b15466b',
                                   'be8e2717e7afe7d3f7eb2fbdc7d5b27104c31c618937019552466509e0c7ade7',
                                   '0d5561e50a75cfb4903d9cfb71bd74e598627097c4a16f67b9948243801eb9a2',
                                   '9273a82f3cd7e89ac2f2f2937c7ce529757ec498dcdde39b05bccf8f1f74e614']},
 'tha-ap42': {'raw_sha256': '59ae94338cd74cb8132fba63bd046e478952658e6d345746e74fe2ac4bbef413',
              'body_sha256': 'a9b1a09c05480dd24d1e3206a17ac09bf11848fe83750dae4bf3a18b36d73f18',
              'notes_sha256': '25ce45787a2250c770de944c28f4937016cba719054d46c813183ebb680996d4',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'title': 'Kapparukkhiya',
              'root_sha256': 'fd1d0318846e87846d77d3719469bc13d4da02b09ed1d944fcd2e73821b54781',
              'notes': [1, 2, 3, 4, 5],
              'layout': [{'local_label': '1', 'publisher_label': '1110', 'suffix': '(1) [1110]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1111', 'suffix': '(2) [1111]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1112', 'suffix': '(3) [1112]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1113', 'suffix': '(4) [1113]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1114', 'suffix': '(5) [1114]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1115', 'suffix': '(6) [1115]', 'lines': 4}],
              'paragraph_hashes': ['6e6361b32788387cc4502e13142fa6fbed91fb31342540a33588a86396145b35',
                                   'ee39fba0756c359185dad8a199398466ee57dbaf21ac4411d7b96e2d82361e16',
                                   'daaedd49b6f835f9f5ea185e55a1f29c727b1064acd2a423ee64dac44350d98c',
                                   'a6bb519e0407a0d3a35890ab27e7b14da7aab664c9b30a607cd00942a439098b',
                                   '9c1164dd9e88e9c2426df3e83f94e439c9389126ce855c98f952ba52739d5f62',
                                   '1defc0da3d78be46b75277c1d6caa18343502520e3a47a96dd267b08169f6f60',
                                   'a1a8feeef22e8be30bb8a1ca1b47e805cdaf196eea411fb54e8f256e6e194ffa',
                                   '090bfb3e050c0544cb1be3eb1db9ed4e5f5e013cccfbc46e991787677ff30ec8',
                                   'b9be7822118f309d97a2fe534fe320f07c841d9f237024ac00c6bc2477f2bb3e']}}
SUMMARIES = {'tha-ap42': {'kind': 'canonical_chapter_summary',
              'label': 'Fourth Therā Apadāna chapter summary',
              'parent_id': 'tha-ap42',
              'first_ref': 'tha-ap42/10',
              'last_ref': 'tha-ap42/12',
              'root_start': 3475,
              'root_end': 3480,
              'root_sha256': '55c2fb02ce77186523fc14dee05d368bba7f2531b56a3a5bf2591a3a011c4a22',
              'body_sha256': 'a944d8701602520ef052519b0c7386a2ad0f4c0bdc78f7b33afe36cb76fd16b0',
              'notes_sha256': '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
              'note_numbers': []}}
ROUTING = {'path': 'src/_poems/chapter-3/chapter-3.json',
 'sha256': '50b6544f4689f2fcbd9287a86890cdcd6993c62b94ebcfb2d5419546f9ded2e0'}
AUDIO = {'present_in_yaml': True,
 'front_matter_raw_sha256': '4d379fa3f4f7283cc53667636d8585d8b1809aaa8b0ee2ad8a12201ffe2101c3',
 'raw_start_char': 51,
 'raw_end_char': 208,
 'raw_sha256': '72fea7162c15c224567d46c12d1630bf8bb6e1d382e8c0a6e6f657eff4012880',
 'poem_paragraph_position': None,
 'body_includes_audio': False,
 'audio_fields_returned': False,
 'audio_fetches': 0,
 'recording_rights_inferred': False}

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
    # Retain all historical source/hash/wording assertions for exactly the previous seventy.
    historical_ids = set(BASELINE) | set(NEW_IDS)
    rows = {uid: row for uid, row in combined_rows.items() if uid in historical_ids}
    assert len(EXPECTED) == 10 and len(SUMMARIES) == 1
    assert commit == SOURCE_REVISION, 'Publisher revision changed'
    assert set(rows) == set(BASELINE) | set(NEW_IDS), 'Unexpected activated source scope'
    assert len(BASELINE) == 60
    for uid, expected in BASELINE.items():
        assert digest(compact(rows[uid], sort=True)) == expected, uid + ': previous metadata changed'
        assert digest(compact({k:v for k,v in rows[uid].items() if k not in ('english','match')}, sort=True)) == BASELINE_PROFILES[uid], uid + ': previous profile changed'
    for uid in NEW_IDS:
        for key in PINS:
            assert rows[uid][key] == EXPECTED[uid][key], uid + ': independent source receipt differs: ' + key
        assert rows[uid]['note_count'] == len(EXPECTED[uid]['notes'])
        assert rows[uid]['title']==EXPECTED[uid]['title']
    for uid in NEW_IDS:
        assert rows[uid]['poem'] == MAPPING[uid] and rows[uid]['publisher_chapter'] == 'chapter-3'
        assert rows[uid]['path'] == '/text/chapter-3/poem-' + str(MAPPING[uid]).zfill(3) + '/'
        assert rows[uid].get('chapter_summary') == SUMMARIES.get(uid)
        assert 'publisher_divisions' not in rows[uid]
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
        if row['id']=='tha-ap37':
            raw=local.read_text()
            front=re.match(r'^---\n([\s\S]*?)\n---\n',raw)
            assert front and digest(front.group(0))==AUDIO['front_matter_raw_sha256']
            assert digest(raw[AUDIO['raw_start_char']:AUDIO['raw_end_char']])==AUDIO['raw_sha256']
            assert AUDIO['poem_paragraph_position'] is None and AUDIO['body_includes_audio'] is False


    def version(uid):
        return 'ap:' + rows[uid]['path'].removeprefix('/text/').rstrip('/')

    with TemporaryDirectory(prefix='pali-apadana-thera-next-') as work:
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
            assert bool(data['publisher_paratext']) == (uid == 'tha-ap33')
            assert all(name not in data for name in ('publisher_preface','collection_summary'))
            if uid in SUMMARIES:
                scope, contract = data['chapter_summary'], SUMMARIES[uid]
                assert set(scope) == set(contract) | {'text','translator_notes'}
                assert all(scope[key] == value for key,value in contract.items())
                assert digest(scope['text']) == contract['body_sha256']
                assert scope['translator_notes'] == []
            else:
                assert 'chapter_summary' not in data
            assert 'publisher_divisions' not in data
            assert not any('audio' in key.lower() or key.lower() in ('front_matter','media','recording') for key in data)

        def check_whole(data, uid):
            check_source(data, uid)
            assert digest(data['text']) == rows[uid]['body_sha256']
            paragraphs = data['text'].split('\n\n')
            if uid=='tha-ap33':
                assert '[Note 1]' in paragraphs[0] and '[Note 1]' not in data['publisher_paratext']
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
                    assert choice.get('publisher_divisions') is None
                    assert choice.get('publisher_preface') is None and choice.get('collection_summary') is None
            assert len(BASELINE_ROOT_SEGMENTS)==60
            commentary=tool('get_commentary',{'uid':'tha-ap19','limit':200})
            assert commentary['source']['locator_revision']==COMMENTARY_REVISION
            assert [s['ref'] for s in commentary['segments']]==['tha-ap19/c'+str(n) for n in range(1,8)]
            for uid in NEW_IDS:
                foreign = 'thi-ap' + str(MAPPING[uid])
                for request in ({'uid': uid, 'translation': version(foreign)},
                                {'uid': uid, 'translation': version(uid), 'translation_revision': '0' * 40},
                                {'uid': uid, 'translation': version(uid), 'offset': 1, 'prefix_sha256': '0' * 64}):
                    assert rpc('get_translation', request).get('isError'), 'Unsafe owner/revision request accepted'
            assert not ledger.exists(), 'Invalid source identity fetched publisher bytes'
            checks.append({'check': 'All70 choices explicit; old60 profiles/manifest/Pāli frozen; independently reviewed new10 mappings and retained19commentary; cross-family owners/revisions/prefixes refuse before fetch'})
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
            excluded = [(uid,'publisher preface',whole[uid]['publisher_paratext']) for uid in ('tha-ap33',)]
            for uid in NEW_IDS:
                excluded.append((uid,'publisher title',whole[uid]['text'].split('\n\n')[0]))
                excluded.extend((uid,'publisher colophon',part) for part in whole[uid]['text'].split('\n\n')[-2:])
                excluded.extend((uid,'translator note '+str(n['number']),n['text']) for n in whole[uid]['translator_notes'])
            excluded.extend((uid,'chapter summary',whole[uid]['chapter_summary']['text'].split('\n\n')[1]) for uid in SUMMARIES)
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
            checks.append({'check': 'All111 printed stanzas are exact quotation positives; distinct editorial titles/prefaces/long notes/colophons/summary excluded; all53note hashes separately verified; short note query limits explicit'})
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            install_navigation_timing_probe(context)
                            old=[{'uid':'thi-ap31','title':'Preserved Therī note','ref':'thi-ap31/2','offset':1,'source_commit':manifest['vri_commit'],'note':PRIVATE+' saved Therī'},
                                 {'uid':'tha-ap19','title':'Preserved Therā note','ref':'tha-ap19/2','offset':1,'source_commit':manifest['vri_commit']+'-apadana-thera11-30-v1','note':PRIVATE+' saved Therā'},
                                 {'uid':'commentary-ref:tha-ap19','title':'Preserved aligned commentary note','ref':'tha-ap19/c2','offset':1,'source_commit':COMMENTARY_REVISION,'note':PRIVATE+' saved commentary'}]
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
                            for family_uid,expected_family in (('thi-ap40',[u for u in BASELINE if u.startswith('thi-ap')]),
                                                               ('tha-ap33',[u for u in BASELINE if u.startswith('tha-ap')]+list(NEW_IDS)+['tha-ap43', 'tha-ap45', 'tha-ap46', 'tha-ap47', 'tha-ap48', 'tha-ap49', 'tha-ap50', 'tha-ap51', 'tha-ap52', 'tha-ap53', 'tha-ap54', 'tha-ap55', 'tha-ap56', 'tha-ap57', 'tha-ap58', 'tha-ap59', 'tha-ap60', 'tha-ap61', 'tha-ap62'])):
                                prior=len(requests)
                                page.goto(base+'/#read?uid='+family_uid)
                                page.locator('.passage').first.wait_for();loaded(page)
                                read_tool(page,'English sources')
                                navigation=page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True,include_hidden=True)
                                navigation.get_by_text('Reviewed publisher edition order',exact=True).click()
                                selector=navigation.get_by_role('combobox',name='Poem in this reviewed publisher edition',exact=True)
                                expect(selector).to_have_count(1)
                                options=selector.locator('option')
                                nav_values=options.evaluate_all('items=>items.map(item=>item.value)')
                                assert nav_values==expected_family
                                assert len(requests)==prior,'Edition navigation fetched English'
                                if family_uid=='tha-ap33':
                                    summary_link=navigation.get_by_role('link',name='Chapter summary source · publisher poem 40',exact=True)
                                    navigation_proof=open_chapter_summary(page,summary_link,delayed_event=theme=='dark')
                                    assert len(requests)==prior,'Chapter-summary navigation fetched English'
                                audit('approved family navigation '+family_uid)

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
                                    assert preface.count() == int(uid == 'tha-ap33')
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
                                    expect(page.get_by_role('region',name='Publisher recitation division · not poem text',exact=True)).to_have_count(0)
                                    assert page.locator('#study audio,#study video,#study iframe,#study source').count()==0
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
                                    ('tha-ap42','revision',{'translation_revision':'0'*40}),
                                    ('tha-ap42','cross-family owner',{'text_id':'thi-ap40'}),
                                    ('tha-ap42','source',{'source':'ati'}),
                                    ('tha-ap42','raw source',{'raw_sha256':'0'*64}),
                                    ('tha-ap42','root source',{'root_sha256':'0'*64}),
                                    ('tha-ap42','terms',{'license':'CC BY 4.0'}),
                                    ('tha-ap42','license link',{'license_url':'https://creativecommons.org/licenses/by/4.0/'}),
                                    ('tha-ap42','missing attribution',{'attribution':''}),
                                    ('tha-ap42','missing changes notice',{'changes':''}),
                                    ('tha-ap42','mapping notice drift',{'mapping_notes':[]}),
                                    ('tha-ap42','visible notice drift',{'notes':[]}),
                                    ('tha-ap42','both notice fields drift',{'mapping_notes':[],'notes':[]}),
                                    ('tha-ap42','missing summary',{'chapter_summary':None}),
                                    ('tha-ap42','summary owner',{'chapter_summary':{**whole['tha-ap42']['chapter_summary'],'parent_id':'thi-ap40'}}),
                                    ('tha-ap42','summary root',{'chapter_summary':{**whole['tha-ap42']['chapter_summary'],'root_sha256':'0'*64}}),
                                    ('tha-ap42','invented summary notes',{'chapter_summary':{**whole['tha-ap42']['chapter_summary'],'translator_notes':whole['tha-ap42']['translator_notes']}}),
                                    ('tha-ap33','foreign scoped preface',{'publisher_preface':{**rows['thi-ap31']['publisher_preface'],'translator_notes':[]}})):
                                page.goto(base+'/#read?uid='+uid)
                                state['drift']=patch
                                choose(uid)
                                expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible()
                                expect(page.locator('#study .translation')).to_have_count(0)
                                audit('refused '+label)
                            state['drift'] = None
                            for item in old:
                                saved(page,base);bookmark_link(page,item).focus();page.keyboard.press('Enter')
                                page.locator('.passage').first.wait_for();loaded(page)
                                assert page.locator('.segment-label a').first.inner_text()==item['ref']
                                expected=(commentary['segments'] if item['uid'].startswith('commentary-ref:') else metadata[item['uid']]['segments'])[item['offset']]['text']
                                assert page.locator('.passage').first.inner_text()==expected
                                audit('preserved existing bookmark '+item['ref'])
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
                            for fresh_uid in ('tha-ap33','tha-ap42'):
                                page.goto(base + '/#read?uid=' + fresh_uid)
                                segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                                segment.wait_for()
                                segment.get_by_role('button', name='Save passage '+fresh_uid+'/2', exact=True).click()
                                fresh = profile(page)['saved'][-1]
                                assert fresh['ref'] == fresh_uid+'/2' and fresh['offset'] == 1
                                assert fresh['source_commit']==metadata[fresh_uid]['source'].get('locator_revision',manifest['vri_commit'])
                                saved(page, base)
                                bookmark_link(page, fresh).focus()
                                page.keyboard.press('Enter')
                                page.locator('.passage').first.wait_for()
                                loaded(page)
                                assert page.locator('.segment-label a').first.inner_text() == fresh['ref']
                                assert page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text() == metadata[fresh_uid]['segments'][1]['text']
                                audit('fresh revision-pinned bookmark roundtrip ' + fresh_uid)
                            checks.append({'width':width,'theme':theme,'navigation_timing':navigation_proof,'check':'All10 explicit new sources; original53notes; note-free preface/summary; combined entries/literal spelling/audio exclusion;17cached-response drift refusals;40Thi+30Thera navigation/Pāli-only chapter4summary;60old profiles/links/Pāli and private drafts/reload/export;fresh33/42 bookmarks'})
                            context.close()
                    browser.close()
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(event['ok'] for event in events)
            assert {event['url'] for event in events} == {rows[uid]['raw_url'] for uid in NEW_IDS}
            report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'publisher_revision': commit,'source_review_goldens_sha256':SOURCE_GOLDENS_SHA256,
                      'previous_metadata_baseline': 'a8c6e47', 'previous_metadata_preserved': len(BASELINE), 'previous_pali_roots_preserved': len(BASELINE_ROOT_SEGMENTS),
                      'chapter_summaries':SUMMARIES,'audio_exclusion':AUDIO,'publisher_routing':ROUTING,'retained_aligned_commentary_revision':COMMENTARY_REVISION,'bounded_quote_exclusions_refused':guarded_exclusions,'short_note_query_limits':short_editorial_controls,
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
                if re.fullmatch(r'(?:thi|tha)-ap\d+',str(scope.get('family_uid',''))): context['family_uid']=scope['family_uid']
                if isinstance(scope.get('nav_values'),list) and all(re.fullmatch(r'(?:thi|tha)-ap\d+',str(x)) for x in scope['nav_values']): context['navigation_ids']=scope['nav_values']
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
