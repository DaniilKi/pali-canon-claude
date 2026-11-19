#!/usr/bin/env python3
"""Actual MCP/browser checks for the ten reviewed third-chapter Apadāna additions; pinned local bytes only."""
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
PRIVATE = 'PRIVATE_APADANA_THIRD_ā😀'
PRIVATE_MARKER = 'PRIVATE_APADANA_THIRD'
NEW_IDS = tuple("thi-ap" + str(n) for n in range(21, 31))
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
 'thi-ap20': '1adde5319c3a01c9a054e286e4b2afb1ef63ee139e8e8c22e3f4ec2a37697d2b'}
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
 'thi-ap20': '21eb44e1b6c4defe3acc0a598f247c37abb381958470d0d7ac09438762649fbd'}
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
EXPECTED = {'thi-ap21': {'raw_sha256': '66d7b2c1d28fb9c3d5208892596564ba29f8aaae64440e278c9009067487fb25',
              'body_sha256': 'b16579a5ccb4441e877a761cd07a2313f4281702ea69ebda29903df0a49ee172',
              'notes_sha256': '678758628be857f342dd251670a181342e9f3a2256a65fabb408216730de9cc4',
              'paratext_sha256': '4e1d279d51a71cd2be8b743cb002f12dbb7c5509713109a6161f02abf38ca7b8',
              'root_sha256': '4f1011602b013dd2a1f2081da422e25f8d35ed65ac31d44bb111c6778a063d3a',
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
                        38],
              'layout': [{'local_label': '1', 'publisher_label': '639', 'suffix': '(1) [639]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '640', 'suffix': '(2) [640]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '641', 'suffix': '(3) [641]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '642', 'suffix': '(4) [642]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '643', 'suffix': '(5) [643]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '644', 'suffix': '(6) [644]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '645', 'suffix': '(7) [645]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '646', 'suffix': '(8) [646]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '647', 'suffix': '(9) [647]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '648', 'suffix': '(10) [648]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '649', 'suffix': '(11) [649]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '650', 'suffix': '(12) [650]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '651', 'suffix': '(13) [651]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '652', 'suffix': '(14) [652]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '653', 'suffix': '(15) [653]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '654', 'suffix': '(16) [654]', 'lines': 4},
                         {'local_label': '17-18',
                          'publisher_label': '655-656',
                          'suffix': '(17-18) [655-656]',
                          'lines': 8},
                         {'local_label': '19', 'publisher_label': '657', 'suffix': '(19) [657]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '658', 'suffix': '(20) [658]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '659', 'suffix': '(21) [659]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '660', 'suffix': '(22) [660]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '661', 'suffix': '(23) [661]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '662', 'suffix': '(24) [662]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '663', 'suffix': '(25) [663]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '664', 'suffix': '(26) [664]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '665', 'suffix': '(27) [665]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '666', 'suffix': '(28) [666]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '667', 'suffix': '(29) [667]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '668', 'suffix': '(30) [668]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '669', 'suffix': '(31) [669]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '670', 'suffix': '(32) [670]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '671', 'suffix': '(33) [671]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '672', 'suffix': '(34) [672]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '673', 'suffix': '(35) [673]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '674', 'suffix': '(36) [674]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '675', 'suffix': '(37) [675]', 'lines': 4},
                         {'local_label': '38-39',
                          'publisher_label': '676-677',
                          'suffix': '(38-39) [676-677]',
                          'lines': 8},
                         {'local_label': '40', 'publisher_label': '678', 'suffix': '(40) [678]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '679', 'suffix': '(41) [679]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '680', 'suffix': '(42) [680]', 'lines': 4},
                         {'local_label': '43-44',
                          'publisher_label': '681-682',
                          'suffix': '(43-44) [681-682]',
                          'lines': 8},
                         {'local_label': '45', 'publisher_label': '683', 'suffix': '(45) [683]', 'lines': 4},
                         {'local_label': '46', 'publisher_label': '684', 'suffix': '(46) [684]', 'lines': 4},
                         {'local_label': '47', 'publisher_label': '685', 'suffix': '(47) [685]', 'lines': 4},
                         {'local_label': '48', 'publisher_label': '686', 'suffix': '(48) [686]', 'lines': 4},
                         {'local_label': '49', 'publisher_label': '687', 'suffix': '(49) [687]', 'lines': 4},
                         {'local_label': '50', 'publisher_label': '688', 'suffix': '(50) [688]', 'lines': 4},
                         {'local_label': '51', 'publisher_label': '689', 'suffix': '(51) [689]', 'lines': 4},
                         {'local_label': '52', 'publisher_label': '690', 'suffix': '(52) [690]', 'lines': 4},
                         {'local_label': '53', 'publisher_label': '691', 'suffix': '(53) [691]', 'lines': 4},
                         {'local_label': '54', 'publisher_label': '692', 'suffix': '(54) [692]', 'lines': 4}],
              'paragraph_hashes': ['412a4ca24814acb23505c9c8ceac770ebd6efc274ffa94e5befb38aff305254b',
                                   'fd3ba661480be058ab8ee09637f821eb1103d1d0ce7ae787820a5d467f390c47',
                                   'fd788686f9ac172b152bffc56f9e0de7898f2596fca87a780acf53b2c4fbd851',
                                   'c45d2fb993bde10caae59ac19a6f1ac621aaafff5244da32e59d4c35623aebdd',
                                   '6b9e55086d1641849beaecf2df21c02bb0dd164b4001752d16469bb5f20ef143',
                                   'fb27ee839efccb0297dbbda03d2cd0fef03a5c67183a7216e435ca54cf015b9f',
                                   '4eb8631ba5c86d98b8ab57b0b3b045e28a5a7ca90a1fd84c6a12afcd71fa0b61',
                                   'edb08db7531dd5dcb83b4f598bd108a816fe0327e9a8ca0f22918f3364de7211',
                                   'ff0d46152e261f48bbf2d315bc8689f7aacff2f91513c1f1fbf86a8eefbabeba',
                                   '60055b785d053d013076ed19c22e70c41254123ee83ff6410194b4a794c43825',
                                   'c30f047395877eb09b83a64f8c64bf6e755c5742669c0bd2f256190d826b7c4c',
                                   '7997beabdaa2f498fc76985d2f3c6b5369de4f7eaaf70769502f4c0c32b355e0',
                                   '173bac67b27293e2dc07234c1f93fe6f8cf9d029f0db4085535144f75a616236',
                                   '130949d4bace338b0a25e2ddb32268c43ff5880de533b397fa95cd8b52f000a2',
                                   'c4e558a3f3e1c696f75152224965e6c0c62498704585bf6c65040bb10d71cddb',
                                   '9edc175a21f6adb3c9864a7545802be69fa4c85044ef50b7730e40fad88b7cee',
                                   '8c85da6b6223a16935c52f7b8dbb72d29aa1471c7bd3e08c34c3e64900220b8c',
                                   'e04620bbc89b79cdef13fb7ffaace29866ed8c7dc3e3a9a756d84be392a12c38',
                                   '9170bc7ea945499f0aa1259771958518eaf243245adf991207855f929df0af7d',
                                   '3d3688ca31547755780d664ce8efeeb883daef441bffaf321f56e7fb0d4826c8',
                                   'fe286a353d2461c590f5e121346f549261c10eda73862e042404d2a6a0483a5f',
                                   '9e69b42ff11186416a13b82f615302492535e8567c12a0f057be6b1da9d8ec9d',
                                   '9e15b435ad3aee25ff3de80a6388b4852dbdbb6e7ff22d9141bb102eeee2beb3',
                                   '4d31cdeb48d73705731573bfb8a2053dd9793be87a36212bc67ad0f24b602a94',
                                   '6f4e43b7e1d102d0520958d5a538afd31bb8d4057412b101f2dfed4e0f9d8496',
                                   'ea36046b15c719c0267e0595eb5589ec0c0b75cfc8c7ab2855c9a2368548a3fe',
                                   '9e45fe82fa4c302a9208c7d5ac8645de6f55561ea12226947fda080de8a5c1bd',
                                   'e775a5ba82bfc7a4c7e4e70ef2b1c3b9694d35b46f2abe6395ce8e22926f91d6',
                                   'ea7496b83dd16acbef8472bd350c43393c2dfdc98162c35d62e7899087b2c828',
                                   '85977542ee4f0dbd7ac586ac71695533f42dc12bfb6822715ea6256fa28749cd',
                                   'cee19249d98b0b9fa6d749ad5e11bfe57a95dda6faf79333b8e5d5410c5511f2',
                                   '1760fd83f41f36b7d4992514475ba66f07fa5dd163398e95035f1a83f13a0f10',
                                   '8cc31ead4133c197d6fb8293288d963fb3909859d570a2c92b3c1124d8deae22',
                                   '9d2d68a7de114b080e376130941e49655956c413575670e44d254db7f496db25',
                                   '42bf6f1caf09b26b1a32ca8bb9b83d9994d4b9fe082e072ab29f8a3d0a3dd0b3',
                                   '7ee2df2f0d9e8c08100410f69a1f7f77503955cfaa65a2ea18b1f71ab6938a9b',
                                   '4239fd043a2e83229fb8bd2df6b539662c2ce252d88a6eaecbabcfe4b254ef68',
                                   '515f31d7deb03cac4fb15357070b14ef13734750ef6b49483f0802458b2c609f',
                                   '8bb77777acdc866cd795c45e2819923546bba7feed2d801c0be0340889fa2be0',
                                   'c8f59c9199bd814cd582b9535777ca4ca322c1741d924ae5bc7926cf40f4dbd6',
                                   'c5a719f9bd6c03b3908d6fbfb3f13291f5c24dc3cd62ffa8040f6072d7059778',
                                   '710831d86b7ed13d544fa94cc6854628d900e0e10e6e3852b71a7b3637b56691',
                                   'ee519e01c195276f63b0217da1bbac6f1a2b4bd615b25197b1168d71bc967e9f',
                                   'ce87e830bc56fb3e4a720a6238098b7c122f99d1cd2c31ce0196d6187a06ae29',
                                   '5368cd9e5303d9defaefcdabd369de01d082aa383fe6662ac4a150b7f547b078',
                                   'd87cc38db46ceb153d66d461c75c5c06800a669257caa8891f705a852e748bf6',
                                   '7038fcaae7f06d8a1ea35d31f26104fbe58edd2e68f2c307a9ddba2526826219',
                                   'b7ec5c91d835b9408a445d68f60f2a2cfbe30c1275266d7e13023e2e8b68e52f',
                                   '1591d2b7a418310ac57e63f8969105643eb2893b266893d54153c99becf39443',
                                   '50bfb0d470a5d3809c2789763900e636141b9c98074da944b5dada858313f9ea',
                                   '5607c187f08ad44caeb06b45e81151cd8faaca3c53dcffeab344088b1aeb12af',
                                   '0a9e315332f9fb2416f8a734eef3c1024875e4cae21b53f17edd563334e764f4',
                                   'f5b138024413f738d68a1e3325a6cf2a963962c3e34bcc99e2f3188587dce569',
                                   '5111150f09c225cf41b3483eaca177f7833cc4092bf0bf84a23333e33c62ebb1']},
 'thi-ap22': {'raw_sha256': 'edc1a1d51684c6870ef2a6b1b550168930d9fcafacdedb9541fe54e913728f47',
              'body_sha256': 'e2724a27e8182b3fa61d77867beec9bff9f07bb01c2162b2a42c683745bb3230',
              'notes_sha256': '3ec6cb1249aefc317b74de6c445589a77c095886f291c42fa95f0066eaddcc66',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '415b9713af215abe2d7a4fb17068b5f40243187674cf8060a38e66b70ef04e27',
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
              'layout': [{'local_label': '1', 'publisher_label': '693', 'suffix': '(1) [693]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '694', 'suffix': '(2) [694]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '695', 'suffix': '(3) [695]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '696', 'suffix': '(4) [696]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '697', 'suffix': '(5) [697]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '698', 'suffix': '(6) [698]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '699', 'suffix': '(7) [699]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '700', 'suffix': '(8) [700]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '701', 'suffix': '(9) [701]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '702', 'suffix': '(10) [702]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '703', 'suffix': '(11) [703]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '704', 'suffix': '(12) [704]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '705', 'suffix': '(13) [705]', 'lines': 4},
                         {'local_label': '14-15',
                          'publisher_label': '706-707',
                          'suffix': '(14-15) [706-707]',
                          'lines': 8},
                         {'local_label': '16', 'publisher_label': '708', 'suffix': '(16) [708]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '709', 'suffix': '(17) [709]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '710', 'suffix': '(18) [710]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '711', 'suffix': '(19) [711]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '712', 'suffix': '(20) [712]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '713', 'suffix': '(21) [713]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '714', 'suffix': '(22) [714]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '715', 'suffix': '(23) [715]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '716', 'suffix': '(24) [716]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '717', 'suffix': '(25) [717]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '718', 'suffix': '(26) [718]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '719', 'suffix': '(27) [719]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '720', 'suffix': '(28) [720]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '721', 'suffix': '(29) [721]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '722', 'suffix': '(30) [722]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '723', 'suffix': '(31) [723]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '724', 'suffix': '(32) [724]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '725', 'suffix': '(33) [725]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '726', 'suffix': '(34) [726]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '727', 'suffix': '(35) [727]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '728', 'suffix': '(36) [728]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '729', 'suffix': '(37) [729]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '730', 'suffix': '(38) [730]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '731', 'suffix': '(39) [731]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '732', 'suffix': '(40) [732]', 'lines': 4}],
              'paragraph_hashes': ['5a7ba43bc24c1e5cb1cdbc3581b002dadaf4bf7d9026ae532a2f45ad649f274f',
                                   '4c1cd8e96958c0149d7570bddbe3a577c971cf50e1fee17af0b518d6264fe613',
                                   'fd48acc77deb9ab89f4fd8fe048afe22b7c18b59227a48d8c895cd379dccc66e',
                                   'db71c101444e15ab0b2eb506f12d38f2ba8205a6f0e5411d5da266f3fbd2158f',
                                   '764f96e3d587965eef74ad29e4611417ea7a89628fb58c792553056a96e07793',
                                   'b1f8577746c8af2e0821067e70efc8baa23c1de47bb50bcdab2310339fd30845',
                                   '446957ded81065143120b3da1fd2df7987a6ea2bb4899b58f9654404af225d8d',
                                   'b4b9d73e7f8dca3b406cd643e9c43f8886fad9134ab9211012afb5cf163d6592',
                                   '67dabcc6e193b117275548c00cfe95fe3bc63e3497a05253179bbffd8575e45d',
                                   '474673936d9af6eb18794a30e99b9d95ed16c9fec02eb343d3953c383b0708cb',
                                   '38304928903d942156c6b96995a5e7fe2d23bcbc148fc1b36711ac19331c0eb2',
                                   '2111df14c4012a226f56367275ee35556236ff5b7ca1b7420b9914a1d3720beb',
                                   '6e83ee84189ba06b34d6e0f998143323eda8f9f279165b8942bd478e11c9228e',
                                   '7e173b0323025724722931284dce73d9102219a05466769a35a68dbd77078fa2',
                                   '9575f3157630fd61379a5d9872e49841cefd3207ed626bc89e1b342e198d33cf',
                                   '994aa870d0f006037491290394e50cb6d36b52f749cd1b0ee24ea4e503b34768',
                                   '57d4c0cc20dd29d082f418919f523b1e530ac0fac3e6cfd02ad6919124ec0e46',
                                   '479c6419ee7546da95b4bad1f3a5c9db16b72e8888cf07d28616b2b73750aeea',
                                   '032ea2a2c58cdbf23b5a93952e06d5f13176789973a7fe3f333d3a1b1301ac74',
                                   'feb23c78325062e852b9f5592f54d93a5b49250fa52584fae2e4f36abefb735d',
                                   '910fa1ec7638925d03123c1f628351113542ff7b2fa69794cfead8c5a3c80db2',
                                   '61bb062039754e25d42d9604c310ffb399037766fe791a60a6fa5910a7e0129a',
                                   'd2e688144f49164697cc9adf5ae93a1217d1522d1a6d617a8103fb59cf2ff2e4',
                                   '07ddcca99c2b48546a5c4ef4630e041ec2f3eacbf66850c8a18cdee56d9f3ead',
                                   'ead322a2be357fed02d59729e89d416f2c3c4c7f1d7e97377bc881db559b4a30',
                                   '4614dff9a99fdd35f4a912d9b1084b068f89076f8758a2f31d293d63467aa503',
                                   'df065989d053307b33ce00dfca004a606a177c4e67313d77e0cc679be8713757',
                                   'aa582c0911484237ea4e301639060d8d2d7e40e6c1e37aaf3664d80c7e8c6253',
                                   '573b61450b5afd906897f5053c848812fab6bf9e43e655d6e1e8a7da6999197b',
                                   '697cf1eca1620a907389c0e4aea157d02187e9a1fb8a6878642bfb48805f8241',
                                   'd378eabb4a01afc9d599992d1dfe2ec566cd536930187bb767d1d74491673ede',
                                   '9dfa4c32658950673543f4fca85f6a99fe4468c62415757a270f0f8e1bb2f302',
                                   '304630f436929efec86c6591fb1f3dafacbe12d94f364934c0d09df91d7393e9',
                                   'aef1a2c1881c8a3f591b3d442e1ca39483ec6607aa78b22d0c2ebc88e4e3bfac',
                                   '300326353fb93d7ea881e87f716cda865621c0c523d377fcc3a4954272a168ac',
                                   'b155a51824ec392609008d9ce9434be2d76c59cabf3275c4a1cb9773c2cd1fa1',
                                   '6500f6a133839a193cc756d70ccf03ecf735823027066062ecc4cd9b05b01ffc',
                                   '8b68155af58eb0d0b7bc6fb3ced03df4d5748b0cfcb1b8f207d40d1dffb33352',
                                   '2c6ee5bd3926223455ea1cebc3b953adef9afb76fed30fd098034e47c8be4ec0',
                                   '82cccf827fc72e3d336be884e290afe0fede55e26522e00087465014dacb3fcd',
                                   '65ac07102dd5af5b2f2b369675e8117c79e2a80401ce081e8051599478d54145',
                                   'f6659824ffb14d22eef934d95379f4e3bef1c8f84a766f3c8119c0dce34b4595']},
 'thi-ap23': {'raw_sha256': '523d4fc54448150007be581676b3c23ef99f62d836e2dc8c02e950ba3ae14c8e',
              'body_sha256': '4abe5c7f6f228a44e42c2536eefde3a2d2bee14874b90ba81415658cc1a8076b',
              'notes_sha256': 'efe93d83fb8a098390b28101cae31fdc72ee3efaf716d6f6734d6d6c1b7b0510',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'a457920710bb058996af0ebb98f588c0ddba51421af2a3fe60cad85c17e57999',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
              'layout': [{'local_label': '1', 'publisher_label': '733', 'suffix': '(1) [733]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '734', 'suffix': '(2) [734]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '735', 'suffix': '(3) [735]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '736', 'suffix': '(4) [736]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '737', 'suffix': '(5) [737]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '738', 'suffix': '(6) [738]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '739', 'suffix': '(7) [739]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '740', 'suffix': '(8) [740]', 'lines': 4},
                         {'local_label': '9-10',
                          'publisher_label': '741-742',
                          'suffix': '(9-10) [741-742]',
                          'lines': 8},
                         {'local_label': '11', 'publisher_label': '743', 'suffix': '(11) [743]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '744', 'suffix': '(12) [744]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '745', 'suffix': '(13) [745]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '746', 'suffix': '(14) [746]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '747', 'suffix': '(15) [747]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '748', 'suffix': '(16) [748]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '749', 'suffix': '(17) [749]', 'lines': 4},
                         {'local_label': '18-19',
                          'publisher_label': '750-751',
                          'suffix': '(18-19) [750-751]',
                          'lines': 8},
                         {'local_label': '20', 'publisher_label': '752', 'suffix': '(20) [752]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '753', 'suffix': '(21) [753]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '754', 'suffix': '(22) [754]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '755', 'suffix': '(23) [755]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '756', 'suffix': '(24) [756]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '757', 'suffix': '(25) [757]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '758', 'suffix': '(26) [758]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '759', 'suffix': '(27) [759]', 'lines': 4},
                         {'local_label': '28-29',
                          'publisher_label': '760-761',
                          'suffix': '(28-29) [760-761]',
                          'lines': 8},
                         {'local_label': '30', 'publisher_label': '762', 'suffix': '(30) [762]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '763', 'suffix': '(31) [763]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '764', 'suffix': '(32) [764]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '765', 'suffix': '(33) [765]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '766', 'suffix': '(34) [766]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '767', 'suffix': '(35) [767]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '768', 'suffix': '(36) [768]', 'lines': 4}],
              'paragraph_hashes': ['3d52d58e60b8e22a824db0ece80a7427b5dc64464066d71ae7d1da4176a32b5c',
                                   'dde47a706e699e61cdfcacd3fd59520ce5726a2ad0c2dcb2b4c0a74bd67fb664',
                                   'e6259acf7af9c95d683328b45ad0b0435b1811f3b261a7ecdac39dadd3207fd7',
                                   '6229e96d3621a6883d27c62558c583d6b7ce7b59c6b6bc8ae74c02c6472181c2',
                                   'b40d1d99e2a2dd33a40049a0ff44a11482502f78e80b753e20bfb0d8888f9876',
                                   'dc395b7e33b6bd5ca8689ae09401ff59f8ee6d7bbae4be70c4ab868ed2310300',
                                   '5e547faa5c764fe7ed92557512b318c6d6dddfe18a832e36102056c501cb7a1c',
                                   '95a3efd0d2cd4ea0ad0ccae505ac91088f3e6fffb8c692b7363bafe51be6988e',
                                   '4a566a3c9bdebd32a350f055ec369c36d88d65f6181614eb8b8001bbd82a27cd',
                                   'efce3078f8dfa948791c1a738d61aeeadd7a23844c01b8f4f74fdf483eb05321',
                                   'ea9895948ea0159763d75d3563fef71dfd53b12bce381975e49b2476ad490dba',
                                   '1dba55819e2a671ce9042d0abbe94411ca263b5f71ccf6cbb31e4c22dbf552a2',
                                   '9fe824affd85a58c7e18e1b91b14ddf7e520a61a2028fe896ed2b5ea98732858',
                                   'b09f720517f9899e5567c7a86f0064577686c0096add4dab98872099b315570c',
                                   '2e748be477e58eb363cc81c13e231a0b9b302566bde7d633bb2d5c1879784708',
                                   '68bc11b8cae27aab9c711609d3480d2771ccbfa5aff8a2518434550a1950d6b7',
                                   '0d7606fca3135b0fc08e04a0a7b5f1bcc02ca3e6c0cc5fb52dd94062c5183685',
                                   'daad16ec0c93652e83dd668552e796f0bf7c6e2a2bdaf43d331a0f7e0d3d0848',
                                   'c9a4cc25c040a4a3e03e871d4d2e7a499418fa39d0486b7f38d9af9ca0168da2',
                                   'd0c1a37860d0a02284508e6fb80d4e0d123a98d637c1d669d7a7a748ffc5efea',
                                   '53cffe606d7fc16b99ac6bfdc8f7d6daaa4a9462a9ba0bca9eec46c7be791f37',
                                   '9fb9e038b38416c2cd0d27029764fae89a3e04b0cf8be579c7913811970ef00a',
                                   '540653e53b384f280de7d7f69f9070a82c261eb5ed57796942f347fed77d663a',
                                   '53c55309e069673076055ec623f052760eee15c630b1e7cf181f4c58598e8183',
                                   '3ab85f0d3692f41b8e515e36904ee8cf24ce601c8e7c2a49a22edbe15cf815ef',
                                   '6a107d7bc313030fe11e068493b3ea34e97ab6e94cbe5893eea77cfe15ec6781',
                                   'a05d245700b97f406f9129f9d2affbcb69db7d46795452daf65205fd618a7123',
                                   '5816896ea631838aefda6e00863b3a03f6d4217af05a8bd25d9b6c1a8759a2a8',
                                   '563fa58db97724eceb5d4a8ce39f7e50c96a25b275fd2a242bca7b23ce4c067f',
                                   '73b2ba3f1115faf0c447457b47011bac460e4731518216708ebf3ba47afe1c5c',
                                   '95e936ccf255da01ddae827222c4a150b648c330722a54b35f1532f4a998aadd',
                                   '12e37c500e28def475aeb4ef9051b7246756bafb58e8bc4248fe8aaebf7d2848',
                                   '0100e4b09b35a41b778de4be01ade466c10572882c15fbad5c0c4300cf239bd8',
                                   '407f8292a39aec2d8b6f271c5ea86a44e46846b35be258c2a5fc1fc456c7ac72',
                                   'd4e24ff30390839bb01018756c62438993b28c4c99d4196e008bfdc7e747651b',
                                   '1373419ad6779ab8ceb61566498b715a5b6e790702e9b8b0672cee961484a04a']},
 'thi-ap24': {'raw_sha256': '7809a044a709f904b842a57733ad60ac854fa196aabd3c20f1e3d02530a58231',
              'body_sha256': 'b59218aaeaf9b095d1a5f27d27fdb94d3b54b8300f68ee428344fc2eaf568745',
              'notes_sha256': 'c43ca4b0c72b6b87e2c126bef239bfb7bc2b2a6c4669a7762a167541b3e49bf5',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '46abcdad17e69e6488b276c332aed0ee3c7a1aff2d613254c3f686f292fe5d67',
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
                        32],
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
                         {'local_label': '15', 'publisher_label': '783', 'suffix': '(15) [783]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '784', 'suffix': '(16) [784]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '785', 'suffix': '(17) [785]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '786', 'suffix': '(18) [786]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '787', 'suffix': '(19) [787]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '788', 'suffix': '(20) [788]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '789', 'suffix': '(21) [789]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '790', 'suffix': '(22) [790]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '791', 'suffix': '(23) [791]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '792', 'suffix': '(24) [792]', 'lines': 4},
                         {'local_label': '25-26',
                          'publisher_label': '793-794',
                          'suffix': '(25-26) [793-794]',
                          'lines': 8},
                         {'local_label': '27', 'publisher_label': '795', 'suffix': '(27) [795]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '796', 'suffix': '(28) [796]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '797', 'suffix': '(29) [797]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '798', 'suffix': '(30) [798]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '799', 'suffix': '(31) [799]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '800', 'suffix': '(32) [800]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '801', 'suffix': '(33) [801]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '802', 'suffix': '(34) [802]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '803', 'suffix': '(35) [803]', 'lines': 4}],
              'paragraph_hashes': ['e379a58c185bc16b2c267e9fb060dcd1de64c0bac934072273983049790cc80c',
                                   '209513c9368ca4fc60bcbaebdc8b72f96b050b11618eb624e804c46af02e9d2c',
                                   'ca7c1ebe6b0f648cbf0284cf08f213c4cadf2aeca81a5d582e61a972a97b7fbb',
                                   'b76a724d960e0556d62f18356d575dd5111625c769829a07c30345dc4a97f985',
                                   '594705bc60052adcdf0eb457ceb58afd2ed828c7fb8285583e5ca3c6f9923628',
                                   'da16fd0dcc54952fefddca96ef071e69f9ca66e31fe21883be324b9c06cdfd1a',
                                   '8b5a710d1a57d4e8bec9df4724694b5d366425eaefff7fd223281ec4191aebbc',
                                   '2b43bc139a259a061a348ef26441329411d41dfb1abaa4a25ef9cfbd981a0f43',
                                   '13bdee4d41a520009c18efbeb2f8fd2d45e2df43de0cf0fa04bbd26163c4e767',
                                   '26944d7edff1cfae46f27b9e8e74da90460b9b28ecfe52154d871ece08e270d9',
                                   '08a3796dc2aa74fea3c9fd94c8fd3deaba55f49f367c63ff8e33b46b79cf3295',
                                   'b4435e70a501145a478112cf39db580fd2463e24d8bd18a427c14957afeb8611',
                                   '1d0db30596b1b3ad73c68d2d3858f5181cd1f0650cae2e56d58e21b7760ff866',
                                   '88dfab1db964c69cfd40555574158dd50e5066c3324d167982f746d6d38761e4',
                                   '059aae29901345242b908331f1e78e76a3fc288a99997570a803914ba81f57ea',
                                   'd8a5499bfdca0ceaddbe1813978f21e73f07ce60ba74528554fd0fbfe3c39c4f',
                                   '6cc0d42bbf045f0737e1d4ae9f35c602ec2e2f149b2059912e3cb8ca3e46bd79',
                                   'a6519e0e51a2e2353c5899a63473baacdcddfa17166ad72c964cb62db5f18ed1',
                                   'd4dc5b5dadf572c60380d694303b63d6982a11e6e2e72ad3b651bf2764372e40',
                                   'd6fd170081e5302ab915f8b7d4b716cd44a92b4a33a611b33a28fd983bd884f9',
                                   'e66796eae76be962ebe513cbfb0ec17c13619bc5a508a123c1f3b096ce78c19a',
                                   'e2819bab15b18d2443bb53778ee431bfe3fa88a6d45fdc233bb6b85f6e55a4eb',
                                   'b78369cc8856478dd0f13c9dbf097de5d405a2f5bc18056a65db6240c9949712',
                                   '1400dc3caecd403ab9714a0376e415cb31627d6fb4b9db60cf93bc2fe3c0aea5',
                                   '87df56c95e6d38b5067cf3c3390024d0c27e4e57af7c06ad1070142f486cb8c4',
                                   'cbf4d433ae6f7e865681c09684bc19c045ed2b82486f234c345b7ddc03f9c128',
                                   'ca33a0bb07f558865eae3004c6b4e91ed3e3e9d9bfbbcc84be509e3636d5bc85',
                                   '0988f1f37c5ffcd2a0cc8d7ba2c4f877d498a92068f3c428bf649832d2f92d19',
                                   'b886284dbd4f59f5bdc75156a5df5ada69c0fe823bd9112c9ea0ca9f97adc517',
                                   '2a6db0f5014bbfa2865d425596dc2c6586db3d67300334b7300a552f44f0c798',
                                   '735a18772d9c4ca0d555b5239c513df1290ac63624dcfe04f12cf98e580f4bd4',
                                   '053dbf0128ffde03755cdd59b119bef85ddfbf423561f41de2746b9d6ce45e3c',
                                   'f31953747d4af47b6feacc067ce48c4946626d841c66a1856e75a99479f7728c',
                                   '08014c999fad88f7a596c3405fda7ee1fc571cc2531197ed76c806c900814eab',
                                   '15427b27b9ad31ce02d735d264ed3fb2cbe6bb851de1693867ec9149a5fa093b',
                                   '21f2f73940b83be7b8082bc4e7e08be394bf5a3ab82dd151a855d3e0abc4b2dc',
                                   '164debda21f98539619f76e6a3f8e730bddd995a72bd183102f5706f3cbd75e0']},
 'thi-ap25': {'raw_sha256': '165826b3d092ecee426ba44ab9589f7c1cabbda4d6a52be5705ea7bc9cbd8a5a',
              'body_sha256': '892ae9078ba8425faa03b077eaf47bfb4ebf57f9a89f5845a30eae022ad2521e',
              'notes_sha256': '0d9ccf067ebae6ab3f2083d3eb46c81c4a88efe0dc3b9189bb512f7d065f949b',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '03ce45ffa40bcfe02a6d975cee81afaa1270c384d3e45fc383b98a88d463ba5b',
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
                        49,
                        50,
                        51,
                        52,
                        53,
                        54,
                        55,
                        56,
                        57,
                        58,
                        59,
                        60,
                        61,
                        62,
                        63,
                        64,
                        65,
                        66,
                        67,
                        68,
                        69,
                        70,
                        71,
                        72,
                        73,
                        74,
                        75],
              'layout': [{'local_label': '1', 'publisher_label': '804', 'suffix': '(1) [804]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '805', 'suffix': '(2) [805]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '806', 'suffix': '(3) [806]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '807', 'suffix': '(4) [807]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '808', 'suffix': '(5) [808]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '809', 'suffix': '(6) [809]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '810', 'suffix': '(7) [810]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '811', 'suffix': '(8) [811]', 'lines': 4},
                         {'local_label': '9-10',
                          'publisher_label': '812-813',
                          'suffix': '(9-10) [812-813]',
                          'lines': 8},
                         {'local_label': '11', 'publisher_label': '814', 'suffix': '(11) [814]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '815', 'suffix': '(12) [815]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '816', 'suffix': '(13) [816]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '817', 'suffix': '(14) [817]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '818', 'suffix': '(15) [818]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '819', 'suffix': '(16) [819]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '820', 'suffix': '(17) [820]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '821', 'suffix': '(18) [821]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '822', 'suffix': '(19) [822]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '823', 'suffix': '(20) [823]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '824', 'suffix': '(21) [824]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '825', 'suffix': '(22) [825]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '826', 'suffix': '(23) [826]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '827', 'suffix': '(24) [827]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '828', 'suffix': '(25) [828]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '829', 'suffix': '(26) [829]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '830', 'suffix': '(27) [830]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '831', 'suffix': '(28) [831]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '832', 'suffix': '(29) [832]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '833', 'suffix': '(30) [833]', 'lines': 4},
                         {'local_label': '31-32',
                          'publisher_label': '834-835',
                          'suffix': '(31-32) [834-835]',
                          'lines': 8},
                         {'local_label': '33', 'publisher_label': '836', 'suffix': '(33) [836]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '837', 'suffix': '(34) [837]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '838', 'suffix': '(35) [838]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '839', 'suffix': '(36) [839]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '840', 'suffix': '(37) [840]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '841', 'suffix': '(38) [841]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '842', 'suffix': '(39) [842]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '843', 'suffix': '(40) [843]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '844', 'suffix': '(41) [844]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '845', 'suffix': '(42) [845]', 'lines': 4},
                         {'local_label': '43', 'publisher_label': '846', 'suffix': '(43) [846]', 'lines': 4},
                         {'local_label': '44', 'publisher_label': '847', 'suffix': '(44) [847]', 'lines': 4},
                         {'local_label': '45', 'publisher_label': '848', 'suffix': '(45) [848]', 'lines': 4},
                         {'local_label': '46', 'publisher_label': '849', 'suffix': '(46) [849]', 'lines': 4},
                         {'local_label': '47', 'publisher_label': '850', 'suffix': '(47) [850]', 'lines': 4},
                         {'local_label': '48', 'publisher_label': '851', 'suffix': '(48) [851]', 'lines': 4},
                         {'local_label': '49', 'publisher_label': '852', 'suffix': '(49) [852]', 'lines': 4},
                         {'local_label': '50', 'publisher_label': '853', 'suffix': '(50) [853]', 'lines': 4},
                         {'local_label': '51', 'publisher_label': '854', 'suffix': '(51) [854]', 'lines': 4},
                         {'local_label': '52', 'publisher_label': '855', 'suffix': '(52) [855]', 'lines': 4},
                         {'local_label': '53', 'publisher_label': '856', 'suffix': '(53) [856]', 'lines': 4},
                         {'local_label': '54', 'publisher_label': '857', 'suffix': '(54) [857]', 'lines': 4}],
              'paragraph_hashes': ['aa1688f52ffd4e7cc31ff5facd65614b6dbaeab0048263739ac1d7bc74f0fe40',
                                   '1915bc467c323b3a59eb887335087d237b21d74f01d928d8f04133589f5a486e',
                                   '3b2b8eecb2b465913d542ede3de005660dd31961867183a41f7f824838fc8739',
                                   '189dedbb02a1aad2dae4546abfc4da2e130a0a12419c71011a4fff1654ba2e7f',
                                   'd0de4bcc475dc48c767a5a0d84091a2c1c749d821366fed0a1fa779f8d4f34dc',
                                   '801bedc38db7fc4651cda159ad9480d8d4b4b0799564ad4edbff4f916c0c32d1',
                                   'c0c2c81065b63ff900ecf0a71cb9117a9769363f7a67ab7ada3e1df92e700b3f',
                                   '52cf18b48c6dde794d1b2fff933d07122c3d29168f89503a6151f64244ab8748',
                                   '0172017aeade848eed224cf75163f781fb820784b941b9e6dd23616f790b0f8d',
                                   'edbe541672035a2922fb364768b519d9bddcd236c8829494fcf9dcac261c5551',
                                   '07c377f8a50eab439a9e626627f453000cf49f254dbb85da9eeaf901285fa3a1',
                                   '2449e2e85136f9d3f99133e732cf91a3fa1216c9a6851f2cb172cdf5561684bb',
                                   '8dffc488904d71bb3d09e481b232db7ba55f75a7c08bcd2a13362d93bd7c96b7',
                                   'ee032f99641986d67f4dc61fab797acc8be0b6ee8014c7f0e422b3bdd7dafbd1',
                                   '03cff3da37b2e2ec1edd68262ac07aa58623e67e4b9b64f7c54439ebac5d73db',
                                   '2a354e0c68d2cb886879402d1e6ddf62d4d5d0dc591d66d7e0dfadedf4bc8d5a',
                                   '3b7d16a9b4d46136be20330c1767c1ca517cabf11b8fe654096b03b8edad4cfa',
                                   '6db7c0c5e531264fe911f080f2810da8ebeec8e551e036b122f5d5661e62e81b',
                                   '53e96f17adf0f9a0ad560e8fba379cc709c3b1c3cc0c2026b63f95a82aec4a2c',
                                   '9fa853c9632c94e9e75dc49bb2c3e494b529af60b64bd98cc34cad4af9656679',
                                   '2ee4eaf12fa26f6870d7d10fe3a1a491907fbfc0476b5b5e3942071c10e1ff81',
                                   'd2f94051eae650f02536c81307648949ee320c534d1f004db07182bc3a02e900',
                                   '13395a0caf1fa02235a674a5b83a65bf6bade18b9c665b4a39f316d3f400272c',
                                   '663807cef751236ecae03d5c6755a8824a4e603c0289a823cfbadb8519f67b62',
                                   '1d5347da274d8828ab3433cd564350ce7398b52cc4c7c1d8de1b1795a65a3593',
                                   'd4119f51f36d4295296347ac02cb43cb24ec026137b16d530c55193ee41334c2',
                                   'bc4867f91e51ee1e8067ee95d0d6b8276a89e889c8b970ddd7aba6c6d09de7b8',
                                   '4ec126f77b75eb9259fdc5d2fcbb9ddb39d75d28801ef12320a0bd1722be7fb0',
                                   '899b50fb8969368de569c334e82eadfa176a6683c5526834a75d29d2ab5daf83',
                                   'd1bc43d94e4422733c616e0fcabff164bdeea3f6cc96bcb1c03e8b913dbc500d',
                                   '0880c47321abefba9bd0259fcbd0733e2b34364c07eab37c79b35a758564b702',
                                   'd462b7cd9866881a2d98ab04b36cf78b6dda9d21c9b690d390ddfb93c29ee85b',
                                   '382adaf1f4c943eb5266a18a37dd80facef2fdafdc31797774728e1c1f592e65',
                                   '2446d3aabfaef44d5176cb88f82571f1a6c41b0b17799887ebdc36602a2931e1',
                                   'fdee4d1574e2e63cc4c6ef6a76371b8f26efa1754e32cf79cd11854f00f82aa2',
                                   'e86e916b514cfd24ea24000f52f141da5a3bce88756586e73de076d5257965bd',
                                   'd0e1a10e9a554cfadb74d61108b7cf847708fe399d72c72661c91e626e3b1ab9',
                                   '37aca029845c21a9b62b651d6b867beb747f19c76204f100b8b7741445951a59',
                                   '50ca070fa4f0b878f1ffb4801e30484a2679eb920b0cd59884f639cb95895b9a',
                                   '4823fb60e9e8d9a78c69d6618facda5eeedb0b0baa2d1c3d5296ba00570f3b38',
                                   '50832f74962861343cd60805ea13ea3a0e6248ad67b2562be412ed913af7403e',
                                   '7a9894f6eb97ebce745221b3519b1c5f3aa40cc834d3a236d1d98e2a46e14597',
                                   '9f1302fcf015274989355c35e0c454a62871c0e775bb8a3b1fdd8c9b304b95d2',
                                   'ac7c65ce3de0f89c319d88a6efd1c3c606038949566c50b4a6967d5296c9cec4',
                                   '1e145b80ab591c62589adf9c808f02e1fd505c22a08a28cc5b13c6078fb3a664',
                                   '62b6e5e908017dfa96308ba52ed3c83e2315d66a392e3bf86366f8efd912fe15',
                                   'e30e431423eafb4413f1f974cce4af319cdd7249b4b998d0b910109b09215426',
                                   'b8bd72cf20e438e87558d9a263076ff313581f7b0cdab3e1e9a78f73e3dc2124',
                                   'c6e56f1358a5b5e8989358999eea338ada866d62a219ca2536aae58547cb35a5',
                                   'e9394b0bf5b00a6b2ed0221b96abf8df3b4988f1030d36cda23e961974a799a6',
                                   '2e447f397558702298551e5b9a9905db299f261e2ac4f9bd475c778545485b8c',
                                   '35674ea79c666e1325a1c25944077d4e50eb888f39e0c12fba01b4e4cc5cca2b',
                                   '57b5fad2f19f4b9bdd5a9832082d821a6dafa9d5621e7e8e4c79853c2ffe5283',
                                   '6f51c14f695fd15768b81e6148d778b7cd16cb4eed9e7b17531bed15619d8db5',
                                   'c5cfcd4dbe4cc2bda83f5035c1ff56dca47d9981ce987b7b326bac1e77f12bce']},
 'thi-ap26': {'raw_sha256': 'dd096cc9537c5cc376d7436070287d0b9afe36aba6d86b03e90820536269c32a',
              'body_sha256': '92b98758f7a67a47a523381e25a17025aa71848c3faaa0d9ec88ec8d5266bf5d',
              'notes_sha256': '9c73a38546770b3f0ead5de5f615574653244d2ff2a0ea17b9c03df199eb1a31',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '42db7cf1214d845377271d558c858e2d6f1fc11ec9aaf4fe253c56fcd2ef44fb',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
              'layout': [{'local_label': '1', 'publisher_label': '858', 'suffix': '(1) [858]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '859', 'suffix': '(2) [859]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '860', 'suffix': '(3) [860]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '861', 'suffix': '(4) [861]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '862', 'suffix': '(5) [862]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '863', 'suffix': '(6) [863]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '864', 'suffix': '(7) [864]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '865', 'suffix': '(8) [865]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '866', 'suffix': '(9) [866]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '867', 'suffix': '(10) [867]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '868', 'suffix': '(11) [868]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '869', 'suffix': '(12) [869]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '870', 'suffix': '(13) [870]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '871', 'suffix': '(14) [871]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '872', 'suffix': '(15) [872]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '873', 'suffix': '(16) [873]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '874', 'suffix': '(17) [874]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '875', 'suffix': '(18) [875]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '876', 'suffix': '(19) [876]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '877', 'suffix': '(20) [877]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '878', 'suffix': '(21) [878]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '879', 'suffix': '(22) [879]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '880', 'suffix': '(23) [880]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '881', 'suffix': '(24) [881]', 'lines': 4}],
              'paragraph_hashes': ['e7f8122a375d13cf8c00c74e4da2aa0300e6ece1e67ad14bf20a4cbc01976643',
                                   'b12944f6738fa01da913cd675264f2a72a05266d8edb9fbe76ae6e36ca187708',
                                   '679d8218de29cf5561400fc6560e90a9a93926b716f396793e2ed3b30b7cb5d2',
                                   '4da873acd32516458f901937ccda660623532531dd5c8ccd97e94c8de16760f6',
                                   'ba0400dc421930f0f2b2f6c361deada23170bce274a6fe55c684f3a07cd49ff1',
                                   'b7aff127fc2aad3edb71efa8b4c11aa4dc004848ad79abcc8b6b1d92b8c0ac86',
                                   '158981375cd6a309cc070dad0added36b07280cbee1daa52697432c4d9a98919',
                                   'b759abb65eea84c04e3b833102bf19d063445a598196e28ca8bb26c143ad9ba8',
                                   'f94c0c4f4537ba76f518c536afa9d5d21d6a8af1f9444dc8e3b7c2b2990d7606',
                                   'c705e3e72d28fce7a7e7c6994ece2ab6d987d125036f9ecb8aa43215162b20a9',
                                   '315ac0d83c3100a27a7a0e7ca208fb9437d3ec73585037cd520949fca8ce6716',
                                   'a5831327d1c041ac9b13ec2997930a753846bdc19c8d0a18364a575e48225810',
                                   '0701f6d3029ff11e188e72b2f34f1e89f2ef2b6331e73406fe8cdd200bf83db3',
                                   'cc3552b06f63b43daf8bd02a5ceb88dad668a2db63fafdf42008610b32a4c4b8',
                                   'dede96871321707b40d06ade9750a30b4c7fc534c1868e54b1c39ae647d2614f',
                                   'f7dc4a6f0fa79095fcc1047b917e5ae7f4083c9f3bacc3643f7367e3ca4f3f87',
                                   'b5e9d52eeb39302192dd1f7613630e19ee4470c7aa133082c17bd4fdd6518db0',
                                   'e11426cc0080a114d8f091a9bf72d76a0eedef89bc07b8537d44ca97718af265',
                                   'e128049edf93674b0f0a7ee67009138d729cfcfe7b6d0aad0fcc640bab28953e',
                                   'fec2d714867a238060f2675245fca5a7a023b21c5f9c27539a077d17143c4eff',
                                   '470a952c72939ed67aef209e017a62db4c0f5a8efb11f61f4e8ff2377810a5cd',
                                   '6f13b51c5f1bca61b3ab72a7c1920f34445cda932ba09929f84e5cb276102cdd',
                                   '1dbaeb13cc52cebca54e7b3edc2c32fbf8a12541f30789ca2d44a3316d616fb2',
                                   '8bc26b2ea1909bfee2cade38f442534f1cf719ca48efe151e660545b5a6d4f55',
                                   'e4210d9d017da09b78e47bc3062b6b564a319a346aa76207488fd6e450e60db1',
                                   '7134806a831ab873fb6583a77eccd81bf0cdb1a2c355286bceca216bb45665b8',
                                   'ee7109b409c383cfd511dd0a934edfc0d84c3e5f19528c74a846860e221ee982']},
 'thi-ap27': {'raw_sha256': 'e57d0ba564a95de1276bb48ff7f11b54b38f32f60d7db3ccfd3e7c563ab6ced6',
              'body_sha256': 'fa3aac1a19928b99c1f6f96b6276732a228630eb8188744a1f2592b8e172145d',
              'notes_sha256': '146d30f6073b2036c4022ca4ffb783eb9dcef12dc92f7c06ef270f20d17cd1a3',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '84149d09812f814c93ced387f86404d5dbeda7d079ee6f99b23351b93ed68272',
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
                        49,
                        50,
                        51],
              'layout': [{'local_label': '1', 'publisher_label': '882', 'suffix': '(1) [882]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '883', 'suffix': '(2) [883]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '884', 'suffix': '(3) [884]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '885', 'suffix': '(4) [885]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '886', 'suffix': '(5) [886]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '887', 'suffix': '(6) [887]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '888', 'suffix': '(7) [888]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '889', 'suffix': '(8) [889]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '890', 'suffix': '(9) [890]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '891', 'suffix': '(10) [891]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '892', 'suffix': '(11) [892]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '893', 'suffix': '(12) [893]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '894', 'suffix': '(13) [894]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '895', 'suffix': '(14) [895]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '896', 'suffix': '(15) [896]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '897', 'suffix': '(16) [897]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '898', 'suffix': '(17) [898]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '899', 'suffix': '(18) [899]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '900', 'suffix': '(19) [900]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '901', 'suffix': '(20) [901]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '902', 'suffix': '(21) [902]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '903', 'suffix': '(22) [903]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '904', 'suffix': '(23) [904]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '905', 'suffix': '(24) [905]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '906', 'suffix': '(25) [906]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '907', 'suffix': '(26) [907]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '908', 'suffix': '(27) [908]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '909', 'suffix': '(28) [909]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '910', 'suffix': '(29) [910]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '911', 'suffix': '(30) [911]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '912', 'suffix': '(31) [912]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '913', 'suffix': '(32) [913]', 'lines': 4},
                         {'local_label': '33-34',
                          'publisher_label': '914-915',
                          'suffix': '(33-34) [914-915]',
                          'lines': 8},
                         {'local_label': '35', 'publisher_label': '916', 'suffix': '(35) [916]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '917', 'suffix': '(36) [917]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '918', 'suffix': '(37) [918]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '919', 'suffix': '(38) [919]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '920', 'suffix': '(39) [920]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '921', 'suffix': '(40) [921]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '922', 'suffix': '(41) [922]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '923', 'suffix': '(42) [923]', 'lines': 4},
                         {'local_label': '43', 'publisher_label': '924', 'suffix': '(43) [924]', 'lines': 4},
                         {'local_label': '44', 'publisher_label': '925', 'suffix': '(44) [925]', 'lines': 4},
                         {'local_label': '45', 'publisher_label': '926', 'suffix': '(45) [926]', 'lines': 4},
                         {'local_label': '46', 'publisher_label': '927', 'suffix': '(46) [927]', 'lines': 4},
                         {'local_label': '47', 'publisher_label': '928', 'suffix': '(47) [928]', 'lines': 4},
                         {'local_label': '48', 'publisher_label': '929', 'suffix': '(48) [929]', 'lines': 4},
                         {'local_label': '49', 'publisher_label': '930', 'suffix': '(49) [930]', 'lines': 4},
                         {'local_label': '50', 'publisher_label': '931', 'suffix': '(50) [931]', 'lines': 4},
                         {'local_label': '51', 'publisher_label': '932', 'suffix': '(51) [932]', 'lines': 4},
                         {'local_label': '52', 'publisher_label': '933', 'suffix': '(52) [933]', 'lines': 4},
                         {'local_label': '53-54',
                          'publisher_label': '934-935',
                          'suffix': '(53-54) [934-935]',
                          'lines': 8},
                         {'local_label': '55', 'publisher_label': '936', 'suffix': '(55) [936]', 'lines': 4},
                         {'local_label': '56', 'publisher_label': '937', 'suffix': '(56) [937]', 'lines': 4},
                         {'local_label': '57', 'publisher_label': '938', 'suffix': '(57) [938]', 'lines': 4},
                         {'local_label': '58', 'publisher_label': '939', 'suffix': '(58) [939]', 'lines': 4},
                         {'local_label': '59', 'publisher_label': '940', 'suffix': '(59) [940]', 'lines': 4},
                         {'local_label': '60', 'publisher_label': '941', 'suffix': '(60) [941]', 'lines': 4},
                         {'local_label': '61', 'publisher_label': '942', 'suffix': '(61) [942]', 'lines': 4},
                         {'local_label': '62', 'publisher_label': '943', 'suffix': '(62) [943]', 'lines': 4},
                         {'local_label': '63', 'publisher_label': '944', 'suffix': '(63) [944]', 'lines': 4},
                         {'local_label': '64', 'publisher_label': '945', 'suffix': '(64) [945]', 'lines': 4},
                         {'local_label': '65', 'publisher_label': '946', 'suffix': '(65) [946]', 'lines': 4},
                         {'local_label': '66', 'publisher_label': '947', 'suffix': '(66) [947]', 'lines': 4},
                         {'local_label': '67', 'publisher_label': '948', 'suffix': '(67) [948]', 'lines': 4},
                         {'local_label': '68', 'publisher_label': '949', 'suffix': '(68) [949]', 'lines': 4},
                         {'local_label': '69', 'publisher_label': '950', 'suffix': '(69) [950]', 'lines': 4},
                         {'local_label': '70', 'publisher_label': '951', 'suffix': '(70) [951]', 'lines': 4}],
              'paragraph_hashes': ['fe15932be172015e77b9a7a939df4b67f3069324a36889520e26c420bcd99cb9',
                                   'e637316edf3dc39a3399e630ee651b66a43520deb343b9af3dd347006bd32e85',
                                   '3b5845ca1be0c0b13c83cd08fba4b0a8fe507eadf779ec41a17f8a8743a2e901',
                                   '878f6785b497d3100b385fc4461f31cb9f5e8e669a1745b086b6346e049118cb',
                                   'ca329dec6c556eea1a9ae8b718906e40fdc21373703cf81bfad5303aa1ff94f4',
                                   '2ef1abb067ec4a1a16f1396ed7261b59386812e641df5bcbddb3548a9c5ad966',
                                   '7c2d0f0950dd4480763e2844cd285f4f29c29f4c2655ba7672d4a9d0bc6d7e74',
                                   'f4e840f1edc139fbf9a765c57d4932bd9e5ddb7882a9ea09094ae0fa951ed952',
                                   '702b10da748e7355071c8f997494ce11159fca6088a569b6480ae670ce452e3e',
                                   '0134c64acac92c50b88fd81e465652820e8b116eb807d2ed79aa44f681612995',
                                   '80a8f7be4cdaaae77f1a8bf4418f539fb0ea7cb99c4ebf4b9659569dddce9c0b',
                                   '6c95d64c98291921e24fcdd04efc2a491c5c0e9eeec79739166f5b3275ed5f71',
                                   'bc86807de986169c18acb5993143958c484aa93b47e266df17886b23bee4bbc6',
                                   '8cfdbbd9d05eca0f968494929ece97da91a6eb10c20bfa3fe202ac8b10e8ceb2',
                                   'fb583896f78af178ae3782b434a2c52ca07ac36af38ea98f8cb6c132348e5814',
                                   'c8e22a525ffdbead3e2e013e4db2eefb28db10558d0a5c8d9192848c7c27a93b',
                                   '5f16f7a4c17d4fcb455eb769eb40b7d3747cb992134e9450c12f58076c927150',
                                   '66f0ffb3c12f4af40c159bb5db7d3ba08abde4d0f556435aa50b738c41d10565',
                                   '2e646a8ae8dc58ec63aec771020b9e21bf0e2834493f71e682f787c847843756',
                                   'f9fc2735922c298d2cb6a7962c7fadbfefa9cb1b78a05fafba137d454c200afa',
                                   'a3c5d8534caf89c009a0625af250ff817510031831a21e35a4411671f9966c48',
                                   '6768728f62efc031c6c4c68eb67991a0559523b5072cf81ad31a61a55ed081c9',
                                   '7663fe88b9734cbb1687229236d2e3d3d49e0a42bec579642c31c49a62f72244',
                                   '23f7043e6d4e29821aa2fd2f5afd26de03309172f53c17c5ff895361e76c59c7',
                                   '6671541b1c244c6d65ae4868ebce60b7b561ba048c77476ba23da7c145cd623d',
                                   '836c2a4ca99c7c6011091b04e7d8be3b8786cc6b613758075fdc032e1ecc96c3',
                                   '28fe71a43dba666ddf4c3fe1a89ab32176667ea5e82c9bf843ee47deaad028bc',
                                   '6867f20d689f0e3c8de2f78fcf9b32ea624e5e1f82f1c5312ef385ecf36f4dfe',
                                   '17e1380adf2108048628f542f7e454f868e726b40cede6a259b4f67bb35c1972',
                                   'b1fb17ae1e07140c01a7fd0eb89aa4f05ec8c47effbb62df6cf18c8d17d81ca6',
                                   '4e2da071e9cbbc1d537f4929f30be354ac99d0ab0dce561eef80944cbc68b004',
                                   'f05c410cc0214b5088e372a408982d7b59d2c8df3807a0f1a17e83c5518c4d3d',
                                   '37e96665e6c316feee3ae89db32defe87ec59d0d2a2c4d91b5af6e44f073ebde',
                                   'dae02a125fdaa887528d7fd444f7f49fa8cd60a2cae6d6aa6442adcba1e3ae6d',
                                   '7e7f0c4e5d4685d30fa85c5c455c145233929bb617e2e24561a89b932ac02f5b',
                                   'fc426a19286ad80e492601d808ad0e93a9d7a3ba8405c22c349de7bfeb2640a4',
                                   'e6b3eefe556d9b36bbea08c493c3f6472abba3ca2339a3405f1be629691492b7',
                                   'de1850a8cb1145692ee004d421666749cc7b33b911d36b1658083cc789080321',
                                   '5d84253b1e0b678259692f1c497d85e5316bcc51fcff06f680e1c31970191c34',
                                   '838f1151d793918e1252a459107a2e31576bee35833f20571fd75a5522f0b901',
                                   '65c7957ab19caac6fdc41a757fb05f514596cf79c10f6f573ff963c2e2383c79',
                                   'aad904589dd3a5b2aa4090abb20c00e8187ddd3071f0192044a6298f34beac9f',
                                   '5ba1b6c750dbe7b1667b07234ea9e35fc3fd9e8c573102ad27e89ec130cce6c5',
                                   '17763e7bfe8c73cb4d028b53c15b9a1069e57683e6449fcccd63fa36f2d54110',
                                   'a85b5477f60414c06e51ce69480724e6ba1221d4eadc04bf32ddf81bccdf5652',
                                   '44e76d10044f7f4247cde81ead2927f4a769bde7ba6d2ae038bca2b43f5ef718',
                                   '2b547d49ecccef033d168e97ba7ddb1c4700626236cb084fd765b98a8d1bf431',
                                   '856b0d202e4df7dda75b241a839df1502cc9824e7b8d7e6ba7b92b316a3ac4f2',
                                   '0f8d15c6f703ee79b3e336bc9d35260266f991abbe11fb4edbb81953a25e90bb',
                                   '1df5b054826f0dfcf2d5b10284ff85e2f338f6e52e0a1a31851705e710c5e369',
                                   'aebeff905a726cf6a083576779bea2fa24eb3235ef1baa58d692bb7a88e53136',
                                   'd8d144022e807b261df373f5084381c5625356a0d672c8aff7de2cbe59da373c',
                                   '4a3c8eedcee9ca414ac5975e00c67e04c27e38460e9bdbf946f012ae41fb0c69',
                                   '8085258bcf730d348913a0ac0a2defb17fbf52eb20b35497ce0d671711fd59fa',
                                   '6180b1f2afb4d090467295c246b701ec59e5bda0b709b73481a73acba6fe74d1',
                                   'cef9ded9f17f48e644f4c9c988544c06c22c0ee3837797fa41fc48f50854a409',
                                   'c24b25ec97d7445452d26aff3bda2a17322387ea1242b2e56b51287a5a7e9fea',
                                   'c27a10ca664d44c8c0049bc9566da669e7fc4ae63215fb7958ff86e7a2a58ad1',
                                   '0da37a2eb5a1554b5d51ce319016a0bb68b77e865eacbcb21b177391c874c723',
                                   'd0286cb55d0635d280502f8b62b42175bce48b298b48eb1e97a20924c4a1f933',
                                   '8f9fd790e7d965ddda767eb85515e7f853cc73dee694d12f03f9b0f64cb6c145',
                                   '7847b8bbff09f0198e7a166b516bc940329075406f346f9cf14c585959837a61',
                                   'e3fdc4bf18760532e98403f01a59d4c8d815e85dbc9378b5fda658b0b70f2e13',
                                   '25a7b581c7a94490c05437fe7c3da225f58b4711b05afbc5b0299f37cf5d92d0',
                                   '5c4e74caa9235507650fc1f83c76bc8179848e860e6359e825051150923710e2',
                                   'b8d8cfae40cb75f82c97836f031a4368686b95c5cbe8c6513cfd827aaf528c52',
                                   'a049f6a54fd82cb8d901dfcd711697cb5f5c894f8b777100355792e0329754fc',
                                   '73110ec782aa55ed14ae6b6cecf1eae7ce326aad5f5a04a6eecd3b2bf21c2897',
                                   '777154b378b23ee76013724ed960fbf0370f6592ee558cd0b5e2cd4f2f5bc957',
                                   '72d1c08e55c61fcd7d545092f5faa5048209e9b1dc4afa4cffec059fca959b35',
                                   'b67b98ae3b8c504a1c26334ba73d469ff54fe2a0a1e2e6e6ec34e63dc19ecb37']},
 'thi-ap28': {'raw_sha256': '8a9159f27ff2ccdb6bfa81cb1d2646268f325cc84b00ec89c8ea8d3118cd3bb3',
              'body_sha256': '62cabcce645d8572d7a25302d59af029911058dbb0626eeb4f1d4942c3768e79',
              'notes_sha256': '2f0e04feb23daba59db7f635e532f6293e6ddddb98bb40398ef7a55bb0458539',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'd47add1fdfd913b0b11bcd0d67a14bf36dedce0e1cf5dc43d2d740bffeebd96d',
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
                        49,
                        50,
                        51,
                        52,
                        53,
                        54,
                        55,
                        56,
                        57,
                        58,
                        59,
                        60,
                        61,
                        62,
                        63,
                        64,
                        65,
                        66,
                        67,
                        68,
                        69,
                        70,
                        71],
              'layout': [{'local_label': None, 'publisher_label': '952', 'suffix': '[952]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '953', 'suffix': '[953]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '954', 'suffix': '[954]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '955', 'suffix': '[955]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '956', 'suffix': '[956]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '957', 'suffix': '[957]', 'lines': 4},
                         {'local_label': '1', 'publisher_label': '958', 'suffix': '(1) [958]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '959', 'suffix': '(2) [959]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '960', 'suffix': '(3) [960]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '961', 'suffix': '(4) [961]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '962', 'suffix': '(5) [962]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '963', 'suffix': '(6) [963]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '964', 'suffix': '(7) [964]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '965', 'suffix': '(8) [965]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '966', 'suffix': '[966]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '967', 'suffix': '(9) [967]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '968', 'suffix': '[968]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '969', 'suffix': '(10) [969]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '970', 'suffix': '(11) [970]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '971', 'suffix': '(12) [971]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '972', 'suffix': '(13) [972]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '973', 'suffix': '(14) [973]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '974', 'suffix': '[974]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': None, 'suffix': '(15)', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '975', 'suffix': '(16) [975]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '976', 'suffix': '(17) [976]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '977', 'suffix': '(18) [977]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '978', 'suffix': '(19) [978]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '979', 'suffix': '(20) [979]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '980', 'suffix': '(21) [980]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '981', 'suffix': '(22) [981]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '982', 'suffix': '(23) [982]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '983', 'suffix': '(24) [983]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '984', 'suffix': '(25) [984]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '985', 'suffix': '(26) [985]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '986', 'suffix': '(27) [986]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '987', 'suffix': '(28) [987]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '988', 'suffix': '(29) [988]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '989', 'suffix': '(30) [989]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '990', 'suffix': '(31) [990]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '991', 'suffix': '(32) [991]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '992', 'suffix': '(33) [992]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '993', 'suffix': '(34) [993]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '994', 'suffix': '(35) [994]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '995', 'suffix': '(36) [995]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '996', 'suffix': '(37) [996]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '997', 'suffix': '(38) [997]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '998', 'suffix': '(39) [998]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '999', 'suffix': '(40) [999]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '1000', 'suffix': '(41) [1000]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '1001', 'suffix': '(42) [1001]', 'lines': 4},
                         {'local_label': '43', 'publisher_label': '1002', 'suffix': '(43) [1002]', 'lines': 4},
                         {'local_label': '44', 'publisher_label': '1003', 'suffix': '(44) [1003]', 'lines': 4},
                         {'local_label': '45', 'publisher_label': '1004', 'suffix': '(45) [1004]', 'lines': 4},
                         {'local_label': '46', 'publisher_label': '1005', 'suffix': '(46) [1005]', 'lines': 4},
                         {'local_label': '47', 'publisher_label': '1006', 'suffix': '(47) [1006]', 'lines': 4},
                         {'local_label': '48', 'publisher_label': '1007', 'suffix': '(48) [1007]', 'lines': 4},
                         {'local_label': '49', 'publisher_label': '1008', 'suffix': '(49) [1008]', 'lines': 4},
                         {'local_label': '50', 'publisher_label': '1009', 'suffix': '(50) [1009]', 'lines': 4},
                         {'local_label': '51', 'publisher_label': '1010', 'suffix': '(51) [1010]', 'lines': 4},
                         {'local_label': '52', 'publisher_label': None, 'suffix': '(52)', 'lines': 4},
                         {'local_label': '53', 'publisher_label': '1011', 'suffix': '(53) [1011]', 'lines': 4},
                         {'local_label': '54', 'publisher_label': '1012', 'suffix': '(54) [1012]', 'lines': 4},
                         {'local_label': '55', 'publisher_label': '1013', 'suffix': '(55) [1013]', 'lines': 4},
                         {'local_label': '56', 'publisher_label': '1014', 'suffix': '(56) [1014]', 'lines': 4},
                         {'local_label': '57', 'publisher_label': '1015', 'suffix': '(57) [1015]', 'lines': 4},
                         {'local_label': '58', 'publisher_label': '1016', 'suffix': '(58) [1016]', 'lines': 4},
                         {'local_label': '59', 'publisher_label': '1017', 'suffix': '(59) [1017]', 'lines': 4},
                         {'local_label': '60', 'publisher_label': '1018', 'suffix': '(60) [1018]', 'lines': 4},
                         {'local_label': '61', 'publisher_label': '1019', 'suffix': '(61) [1019]', 'lines': 4},
                         {'local_label': '62', 'publisher_label': None, 'suffix': '(62)', 'lines': 4},
                         {'local_label': '63', 'publisher_label': None, 'suffix': '(63)', 'lines': 4},
                         {'local_label': '64', 'publisher_label': None, 'suffix': '(64)', 'lines': 4},
                         {'local_label': '65', 'publisher_label': None, 'suffix': '(65)', 'lines': 4},
                         {'local_label': '66', 'publisher_label': None, 'suffix': '(66)', 'lines': 4},
                         {'local_label': '67', 'publisher_label': None, 'suffix': '(67)', 'lines': 4},
                         {'local_label': '68', 'publisher_label': None, 'suffix': '(68)', 'lines': 4},
                         {'local_label': '69', 'publisher_label': None, 'suffix': '(69)', 'lines': 4},
                         {'local_label': '70', 'publisher_label': None, 'suffix': '(70)', 'lines': 4},
                         {'local_label': '71', 'publisher_label': None, 'suffix': '(71)', 'lines': 4},
                         {'local_label': '72', 'publisher_label': None, 'suffix': '(72)', 'lines': 4},
                         {'local_label': '73', 'publisher_label': None, 'suffix': '(73)', 'lines': 4},
                         {'local_label': '74', 'publisher_label': None, 'suffix': '(74)', 'lines': 4},
                         {'local_label': '75', 'publisher_label': None, 'suffix': '(75)', 'lines': 4},
                         {'local_label': '76', 'publisher_label': None, 'suffix': '(76)', 'lines': 4},
                         {'local_label': '77', 'publisher_label': None, 'suffix': '(77)', 'lines': 4},
                         {'local_label': '78', 'publisher_label': None, 'suffix': '(78)', 'lines': 4},
                         {'local_label': '79', 'publisher_label': None, 'suffix': '(79)', 'lines': 4},
                         {'local_label': '80', 'publisher_label': None, 'suffix': '(80)', 'lines': 4},
                         {'local_label': '81', 'publisher_label': None, 'suffix': '(81)', 'lines': 4},
                         {'local_label': '82', 'publisher_label': '1020', 'suffix': '(82) [1020]', 'lines': 4},
                         {'local_label': '83', 'publisher_label': '1021', 'suffix': '(83) [1021]', 'lines': 4},
                         {'local_label': '84', 'publisher_label': '1022', 'suffix': '(84) [1022]', 'lines': 4},
                         {'local_label': '85', 'publisher_label': '1023', 'suffix': '(85) [1023]', 'lines': 4},
                         {'local_label': '86', 'publisher_label': '1024', 'suffix': '(86) [1024]', 'lines': 4},
                         {'local_label': '87', 'publisher_label': '1025', 'suffix': '(87) [1025]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '1026', 'suffix': '[1026]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '1027', 'suffix': '[1027]', 'lines': 4},
                         {'local_label': None, 'publisher_label': '1028', 'suffix': '[1028]', 'lines': 4}],
              'paragraph_hashes': ['4b9df748223bbefeb355eae9dc5687757a81e23df69466548e77658d9491291d',
                                   'a17cfab945fdb99c015a8ab092d362f8d06f949e2f768f530226b6e49f0225be',
                                   '2490825bbd071592651948bea9f6093d28422937e20ed07b7a6b23ecc20083ec',
                                   '6b3b15373943ac0657e11067cf6b1f7f42d3a216892bbcdeebe021d04311a098',
                                   'aed7c0db88077aa2c6a04352f358fdb748a2fb8074fff679f52e93d1c114070d',
                                   'ef43ac691847a5939091f7fe4bcde2f465fa33dc644b60547ab8dcdebb470777',
                                   'dac62b52fb36858323a306f6a953d1cddca3bbafd5495344818d862d2690779e',
                                   '7e70cf2bc7a96fd876e138c566c54385cb35f522c85a5263c65fa6d9b722e437',
                                   'd35532b557cb6a41edd69af55f1e5170553008ee078440e7787908924b373942',
                                   '216099ffa2a57e175706c6c37652faf6852dada3f758f042df0c0d4f9ceae38e',
                                   '80419d794aa57fef738cb87cdca83d3f18dbed977be5c1cb647f7d9c147c1c14',
                                   '1f121cdcd79f75da3cc4c52adc40b37f855f8348390041921076fbc5a5790dcc',
                                   '322312abd66c429a0998aad8d69560687cbf2ea46378da17a45f6f2a90b68eb1',
                                   '4417a1b60eb8127d06d14a3e7f2c4562c06558a8855a640213e94137f6ed95f6',
                                   '026f7e6c852310210e9ef030d093cc038d8805669a42447b1925e97beaa78788',
                                   'c737c38a5fd26bacab77bbbb13775e7fcf1cc9ee93a4cf2ca99e852138d3f74f',
                                   'f95701f082de7f60f80de652c54733f0f401e0acb01687ebe2e72b12387261c2',
                                   '46a009a9a928a933bd2aeca967e4ca624e32ddbbb5ac9836a81cb3375fbf97f3',
                                   'ca69e3ff4b3f03702f00d111907de1f825d6a28871758be145e393cde245b4ed',
                                   '6be7ee5124bd1e7f6fca9bb872e5a71e4fdd28e811792af7fa94e6f49d2c5177',
                                   '3127e0c7b03d99fddaf9bc1dd647398da69ba02a1a397ddcccf5995341771f52',
                                   '050977f0771368c5fa871d96cc32077b182109a1ecbfddec32bd50bd4ad7250d',
                                   'e521bd93f70bbe29c3d3b84b63810ae3b61f18652f0f7923388956ed35ac9344',
                                   '0045e3eb6dc6a33a8d93c950f03803229090f39194507af32d5d67181fd38837',
                                   'd7b163cbcad3b7d3092c06c87f730960b0a69753e43028ec1834c03ea11f3f72',
                                   '812be9f3681b3bfda67ba9bff78e85a60e1706b836fb336809ced97c31975117',
                                   'f138d83a9f2eea549b99fe05270ff689d7979fffbff8ed3c4030b3d1f6020780',
                                   '96381acb17cbc43628ee07244ba0634ecbcf1b01a4a5fbe9d37d305defabb3ba',
                                   'f6e570104826153a98ea43da7015c84bd84b16cd295ab3ca9cebe84e9811a10e',
                                   '7c940ce4c09fe2cc5030135a2d970bdc759fc138da0768f6cea480ec6bd5eb19',
                                   '149bcc3ec3cb70ca82ce9bced8e36f015e5e5f1cb8170962e92b19613a8e4ade',
                                   '0c8252e41c5da3a1e3f2c4885ab003a58136e518d650f5a7b6a771cee67d03f8',
                                   'd93053eccd8c9ea1d165c0ba4ecbfd0faffbcb97578e89237da74cffb9a9932a',
                                   '638fa6c982127658c428802db70f46a21c595b451b1fcd8dc29ea9e348cbb186',
                                   'eaf64cefea49119fe94d899473a2f2314f86eb6335eff088de7bc2493149c9e8',
                                   '9ea36a191bd94e579e2010fb9b62fab7c7da357da124bc6d22be85317564b7b0',
                                   'da46876eeee3e530b1c3a8f234f164fb433518c745fdfdd59827c148fed5c267',
                                   '7e736f20fb52392270f24ddaa96f46ebb5c938a63ad8effeb3eff735303203d8',
                                   'b89e00a29db19225dc59d9a543365aa9095d7cae1a4dd91d17c5918dc935dd26',
                                   '6fb19efb8486e1bd64a091f22ea0ca03409aa97aa7db048a49a5f338877056a3',
                                   'c303937ac98a7f7456eaf6e821b5dd299c7457944fb66f6fd0ddea70e5ac2e00',
                                   '7ba4b41f35299cabc3b33042972074d4bc0900f61a07f5cf2c3668c01df00da2',
                                   '17b745570079f9ead3ad26d8a366205425f9d26c26e6853be8625ab8ba1f6e7e',
                                   'bef7795dd887e22e4aab1509e2f1f38bfd2fd2546ce763813cc999555877be4e',
                                   'bf4d237bca3d27c2aaebeb2434eec52fdc726ef34dfb7611b2e7000c3177e944',
                                   '0a142976a6c8580212c652abc4b803efb17e8a2ac30510a918b2e10151c37b0c',
                                   '70303e6b8bcc09fa3e6619e84d6bb9bc8bd0aa88dfc40b56a050aa816fcc819b',
                                   '2a049b9956969bf7720a9dbf9da4a610141e216a819e06363d30f4b53558cd34',
                                   '67697b26829e37b4ed7804b9a107a3d0d9c1e2b4943fba485662451d40ff1874',
                                   '8cefe6edf1ba7d4aab0595c984d25ff389c65f996bc61ccef01bbac890c3755c',
                                   'df070abfd94e7a36703fab04947a021cc6bb04d6eb9dd448933416268555ea77',
                                   '3b4490c5444e62f62956b5ab94c10146e6a52f316ee30e58613155778722d7ff',
                                   'ee0cb35ee450f2a7581b641c9a4867abc140cb1b8728d5a6e2bd905746a4ac93',
                                   '887829822468ec9f454a02bc8b161529bba60ba42a9b8ccbfa3bd36318ab80e0',
                                   '75937f32ea5299af505e593a0371724b0db70aa425b1229922000b422aebd354',
                                   '642964e2b4d2bf7ec041a0984aec31c397aef0dca7600eb2daacfe6f88c17e5c',
                                   '2fc5ecaddaeffc4c6f9994327ec21376b43686bd62f00b345a2d0829bf275aad',
                                   '7494d1264c799223a586535b5127f6dbeb9825599931f70b5d279e8352df96fe',
                                   'd51b126296f1a6f6f27bd41ceb037fa31f5718dbed5483d685a161580f9e085d',
                                   'f8305d01bdf162f61dbe59fed93822254828cc87aa5b2beab661139c79db24f2',
                                   '6caa882f83bcb014281c57d13fbc58331686aaaf02d1df1a80efcbd5972b9746',
                                   '2c071fbc88b114f41cd37c72fc27a947e46bf3878ada12106e0096b4db1332d8',
                                   'c0b8632e50b6a35bbb90a0b755b4dde9becf8a74a94de0109b5330f0c75545b0',
                                   '09012007fbb157907788ac63fd7cfaa65321b7d4d8968ef281ad78a06ab3406a',
                                   '492f10a07a601af2cda3290fed0d02a46f87e1f6d1136113cf9545e1e1c0610f',
                                   '9db8dcf6573006a6e79e1308448b8b2bea7682c2ad52664d3365ab469f0be201',
                                   '12498e5febbddb9f3c47aefa5fd599bcab8ff3a7df779ef549fe31c828332dfa',
                                   '1d7bc927af8a6786e32f9e4c524c33c24d9536080f5bb23aa916f97b2450d5b7',
                                   'a3fabc4bd159891d20e79d7ec8e98c848013aa2c3d1c4922a59a3cbb011b7835',
                                   'b41e9502043e820b9b4be6e360008d90b3ecdecae7f9d1ade0a6242313cd00f5',
                                   '85cb85e1a41b5a677785a8d293a1f4988116448adbff80626162a1d4c6e30a9c',
                                   '533a682d8a56607ebfb37bd3744ab8d28c02ae5a26abce5a9bbc2b98a1b20b7e',
                                   'd9b7db88fc544c71e250474b363747cbed03f4eb6986d31bde4530e70a7718e0',
                                   'f8d469069c1feeacff150f19476a20a7ed05ac68c90dc118ba94a476b66e52bd',
                                   '6af3f076496f97b311a4f17e1a1864b2c6cbcd34feb598b14e31cd5fb344b643',
                                   '9724e73876421f97df8b1b6d40d87027a916f1fbcc5ee4a45c54db0a2af677dd',
                                   '7caf889dfc1cfd9670bd1ab37c5eaa0a9229ad7ffdf41acae8c7ee8c9ee259f9',
                                   'b227ffb0660a71efd9d82491fca7d172a3aaf3c475034d412180f931d8e34999',
                                   '85cc7a99dd7dbe680e4f6f421455ca1a3061f9daa567ca416652df595733edc7',
                                   'a554888a0a37711c26a3eee5ec495aecac10966a2e3aefbae21a7778d1786557',
                                   '9869659d71da4bef0400dbff5301dd2b82ab4ae902c14d78d1aa9af36fb63f52',
                                   'cd861129ef7120c687154b8461e42ccc767002842547930736c89c2fc7d401e5',
                                   'f5de0fa4fb6d3bfbd59ac5be988c8cc62986c7471965fa84b66d6e86178e589c',
                                   '3f22a31a646263b51f94e25d0ec62fa2ffdfcb74b7501fb7440835bd3057eb86',
                                   '6c35798254a7a459ed66fbed0e6227435e14461833545ac5cb5e537d330387b9',
                                   '6f8f581cc345b420607fd96717f4a3538bb41d2536a15176bfbb6c1dd01af60f',
                                   '8a4b60e9dafcddfe69fe3e77ebbdbc65ac8e1d38f319797c1af64cfbd8d5e893',
                                   '3ade6f3c19204c4990f881d516c8dfc6e3e2115e484a3f6a1c738d93146945c9',
                                   'b16ecf7609a44647d29f1a621d65033f3bce1c8ed4cad25b468f8178a5506712',
                                   'b5e8755d85d55e7322abece637ee91749120ba2aa59c9272fc4f51b11034d93b',
                                   '99d272564c0834905e10d8d3980dfb8ce37e053f9a33d52b11644760e5a8e416',
                                   '54bdf84dbdf32b31b7f1ccaf309cb18408527289a980de8d25b6e440d3dc313b',
                                   'df881e82a9051661d5e74da3d0d74cfb1a41254387f2baf4522c0fe78cd68b99',
                                   '6791262140575106bb241de1e119f5d22b24f72865dd48a35074bbe758dcf01a',
                                   'ffd0cd6b5a6f0465be733ddcf488e99905f4ad2b8476fda73fc659fafae828e4',
                                   'ee49c71bb5c58b49089d7a0a1acda74bfccb4ff290fc06a92ad0e1ffbc1ad55d',
                                   '9c2ae081f8e2bc19772db8b4c798150b5fd2b4d60632751654c2708afbfa7f96',
                                   'f7ac6bff1f37d99816195ded90169652cfac468dffdc78a231ec937a45ed3ce1',
                                   '1bf2eeb3d7c1d2e1e54e124267e7cccb47ea6c6f2701af59a93611e88fb1aca9',
                                   'd7ad8c71c228687ef781614a4930f7594309751bbf336f306a4bb4f769bf3a35',
                                   'b6ce074d02acdfe03837a939a4a06efbc5332e08444d4aee77831e76cfc29544',
                                   'd32e3c238dfc0deec966b71e8c0b1d742df1a57166e71fd8cfad80020a5a5172']},
 'thi-ap29': {'raw_sha256': '0c227726b5e8f6de70f52380b1e416898c89ab887a074dc202e0df888b0fcfe6',
              'body_sha256': '727ee2cfd9b85b94eaeb232f9dc9f508fdf23e019d43a40cae5f2e0100a410f8',
              'notes_sha256': '008cbade61dbaf86c71aa6ee530be0976e0c86288025d83ddd4c97eea4e8f132',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '9ecd73d2bab8c4d745b50f8c727ae9b24200c4f2badf0c00cbbcfa5f2ab0b334',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9],
              'layout': [{'local_label': '1', 'publisher_label': '1029', 'suffix': '(1) [1029]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1030', 'suffix': '(2) [1030]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1031', 'suffix': '(3) [1031]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1032', 'suffix': '(4) [1032]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1033', 'suffix': '(5) [1033]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1034', 'suffix': '(6) [1034]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1035', 'suffix': '(7) [1035]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1036', 'suffix': '(8) [1036]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1037', 'suffix': '(9) [1037]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1038', 'suffix': '(10) [1038]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1039', 'suffix': '(11) [1039]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1040', 'suffix': '(12) [1040]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1041', 'suffix': '(13) [1041]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1042', 'suffix': '(14) [1042]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1043', 'suffix': '(15) [1043]', 'lines': 4}],
              'paragraph_hashes': ['bc9354d75fa964dd22ea8c42428a16b0ab6bd501e926cfd888d2f55a24998d27',
                                   'f73c1f92d6253d663abdf57b6b6cee7e33b44b28d4ae01da6957f53d5e06576a',
                                   'f48518cc5f168c6246efa6c7cf43f47aa40f882781872533110fafbeba79a7bb',
                                   '0ca11626ee2072966cc6e069431287d9d556f3c66be2c424f6872b0ed5a30ecd',
                                   '6e4620b39c8c2ca57e0427b3157b194ff287c9123c4f0921a34949c3b7cbdabe',
                                   '75ed7bcf511b34b23a2ae13fb299d4d43820944e50b7b01db2764653a5d74378',
                                   '956fb0c7a27eb436219bd8c0f9daf563634d9ca6e540532df2e6f56c22551145',
                                   '960bdb4cc97030094039604d869febef90bf07b6d5c43fad6fc5a030efd30d19',
                                   'c543f43db2d2bc1900614cadd6cd20803b6674feed0ca72611afee29f862db6e',
                                   'c4f5b6ee6c8773585f8d34944bf8f7d2e94ee6be3f5fc7bb91093b5c0a50b555',
                                   '482be86b8cc4981b60e8fda24464e3346ca5271b43e9d637617323a3b752fd27',
                                   '4bfb7abf147bed27caa3c37e5c8a90ba943be940eca14dd850f584c566c2cb0c',
                                   '8622901b9ad6a14d6c50164287a481192d4d924ba711ce83350182a765b1763a',
                                   '7c6b2cdcfc59e0806be632c3c784625ae9373b859d0b41b9bb4eb3a522f482c2',
                                   '7b35e41ecf551f02aaaf740925647828eb82db990a93caaf609dea595deb0a9b',
                                   'fb44343384f81636e18221f41ab94ead47d68faa6e2414365e9bbd078d8fdae8',
                                   '6efe9c4b239177b77198f05da8ff898294c0a89cfacae9ee4bf21205e4188c71',
                                   'd536e04d900bec9229541c36f262857691e8a9e78c505f9c1131c993a7330a25']},
 'thi-ap30': {'raw_sha256': 'bf697c2677fb74215826ed9c8a35c14e41bc5456a459bb8d9a5c95af2e8fb4f1',
              'body_sha256': 'd14cf8c0fa3df7f44c5a5b41272f2e13c8ad3fb824113c6d307e1dbb8eb1dc54',
              'notes_sha256': '1addb7ad0bf0d7ed1dd79648d5922cb1e6e015ad5eb2003ca661508d4a9ee043',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'ba8864b9bb6922b704d7aa0d92024311e4df69b0aad3429335dac8d48a8f2494',
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
                        42],
              'layout': [{'local_label': '1', 'publisher_label': '1044', 'suffix': '(1) [1044]', 'lines': 4},
                         {'local_label': '2', 'publisher_label': '1045', 'suffix': '(2) [1045]', 'lines': 4},
                         {'local_label': '3', 'publisher_label': '1046', 'suffix': '(3) [1046]', 'lines': 4},
                         {'local_label': '4', 'publisher_label': '1047', 'suffix': '(4) [1047]', 'lines': 4},
                         {'local_label': '5', 'publisher_label': '1048', 'suffix': '(5) [1048]', 'lines': 4},
                         {'local_label': '6', 'publisher_label': '1049', 'suffix': '(6) [1049]', 'lines': 4},
                         {'local_label': '7', 'publisher_label': '1050', 'suffix': '(7) [1050]', 'lines': 4},
                         {'local_label': '8', 'publisher_label': '1051', 'suffix': '(8) [1051]', 'lines': 4},
                         {'local_label': '9', 'publisher_label': '1052', 'suffix': '(9) [1052]', 'lines': 4},
                         {'local_label': '10', 'publisher_label': '1053', 'suffix': '(10) [1053]', 'lines': 4},
                         {'local_label': '11', 'publisher_label': '1054', 'suffix': '(11) [1054]', 'lines': 4},
                         {'local_label': '12', 'publisher_label': '1055', 'suffix': '(12) [1055]', 'lines': 4},
                         {'local_label': '13', 'publisher_label': '1056', 'suffix': '(13) [1056]', 'lines': 4},
                         {'local_label': '14', 'publisher_label': '1057', 'suffix': '(14) [1057]', 'lines': 4},
                         {'local_label': '15', 'publisher_label': '1058', 'suffix': '(15) [1058]', 'lines': 4},
                         {'local_label': '16', 'publisher_label': '1059', 'suffix': '(16) [1059]', 'lines': 4},
                         {'local_label': '17', 'publisher_label': '1060', 'suffix': '(17) [1060]', 'lines': 4},
                         {'local_label': '18', 'publisher_label': '1061', 'suffix': '(18) [1061]', 'lines': 4},
                         {'local_label': '19', 'publisher_label': '1062', 'suffix': '(19) [1062]', 'lines': 4},
                         {'local_label': '20', 'publisher_label': '1063', 'suffix': '(20) [1063]', 'lines': 4},
                         {'local_label': '21', 'publisher_label': '1064', 'suffix': '(21) [1064]', 'lines': 4},
                         {'local_label': '22', 'publisher_label': '1065', 'suffix': '(22) [1065]', 'lines': 4},
                         {'local_label': '23', 'publisher_label': '1066', 'suffix': '(23) [1066]', 'lines': 4},
                         {'local_label': '24', 'publisher_label': '1067', 'suffix': '(24) [1067]', 'lines': 4},
                         {'local_label': '25', 'publisher_label': '1068', 'suffix': '(25) [1068]', 'lines': 4},
                         {'local_label': '26', 'publisher_label': '1069', 'suffix': '(26) [1069]', 'lines': 4},
                         {'local_label': '27', 'publisher_label': '1070', 'suffix': '(27) [1070]', 'lines': 4},
                         {'local_label': '28', 'publisher_label': '1071', 'suffix': '(28) [1071]', 'lines': 4},
                         {'local_label': '29', 'publisher_label': '1072', 'suffix': '(29) [1072]', 'lines': 4},
                         {'local_label': '30', 'publisher_label': '1073', 'suffix': '(30) [1073]', 'lines': 4},
                         {'local_label': '31', 'publisher_label': '1074', 'suffix': '(31) [1074]', 'lines': 4},
                         {'local_label': '32', 'publisher_label': '1075', 'suffix': '(32) [1075]', 'lines': 4},
                         {'local_label': '33', 'publisher_label': '1076', 'suffix': '(33) [1076]', 'lines': 4},
                         {'local_label': '34', 'publisher_label': '1077', 'suffix': '(34) [1077]', 'lines': 4},
                         {'local_label': '35', 'publisher_label': '1078', 'suffix': '(35) [1078]', 'lines': 4},
                         {'local_label': '36', 'publisher_label': '1079', 'suffix': '(36) [1079]', 'lines': 4},
                         {'local_label': '37', 'publisher_label': '1080', 'suffix': '(37) [1080]', 'lines': 4},
                         {'local_label': '38', 'publisher_label': '1081', 'suffix': '(38) [1081]', 'lines': 4},
                         {'local_label': '39', 'publisher_label': '1082', 'suffix': '(39) [1082]', 'lines': 4},
                         {'local_label': '40', 'publisher_label': '1083', 'suffix': '(40) [1083]', 'lines': 4},
                         {'local_label': '41', 'publisher_label': '1084', 'suffix': '(41) [1084]', 'lines': 4},
                         {'local_label': '42', 'publisher_label': '1085', 'suffix': '(42) [1085]', 'lines': 4},
                         {'local_label': '43', 'publisher_label': '1086', 'suffix': '(43) [1086]', 'lines': 4},
                         {'local_label': '44', 'publisher_label': '1087', 'suffix': '(44) [1087]', 'lines': 4},
                         {'local_label': '45', 'publisher_label': '1088', 'suffix': '(45) [1088]', 'lines': 4},
                         {'local_label': '46', 'publisher_label': '1089', 'suffix': '(46) [1089]', 'lines': 4},
                         {'local_label': '47', 'publisher_label': '1090', 'suffix': '(47) [1090]', 'lines': 4},
                         {'local_label': '48', 'publisher_label': '1091', 'suffix': '(48) [1091]', 'lines': 4},
                         {'local_label': '49', 'publisher_label': '1092', 'suffix': '(49) [1092]', 'lines': 4},
                         {'local_label': '50', 'publisher_label': '1093', 'suffix': '(50) [1093]', 'lines': 4},
                         {'local_label': '51', 'publisher_label': '1094', 'suffix': '(51) [1094]', 'lines': 4},
                         {'local_label': '52', 'publisher_label': '1095', 'suffix': '(52) [1095]', 'lines': 4},
                         {'local_label': '53', 'publisher_label': '1096', 'suffix': '(53) [1096]', 'lines': 4},
                         {'local_label': '54', 'publisher_label': '1097', 'suffix': '(54) [1097]', 'lines': 4},
                         {'local_label': '55', 'publisher_label': '1098', 'suffix': '(55) [1098]', 'lines': 4},
                         {'local_label': '56', 'publisher_label': '1099', 'suffix': '(56) [1099]', 'lines': 4},
                         {'local_label': '57', 'publisher_label': '1100', 'suffix': '(57) [1100]', 'lines': 4},
                         {'local_label': '58', 'publisher_label': '1101', 'suffix': '(58) [1101]', 'lines': 4},
                         {'local_label': '59', 'publisher_label': '1102', 'suffix': '(59) [1102]', 'lines': 4},
                         {'local_label': '60', 'publisher_label': '1103', 'suffix': '(60) [1103]', 'lines': 4}],
              'paragraph_hashes': ['0b7c197190a18390ef85bff1e7d60724892e7d5d788c9c9ba05186349dd82fdf',
                                   'fa7568c8325c9284f3f0d61a322623663328847b427aa1f0bd22abed4ecc8877',
                                   'd22c69f7c7bd1a61fec0d1fa27d1f176e08dede19ddc181e18f5118f4336f09c',
                                   '673fcbe1f141ae313a05bb98537e127591e596c98d11aaddb080654edef32568',
                                   'cbeeed59c87ac79cccaf46665438e31266d73ae814c0bd9f1559cba8d49afab6',
                                   'a721e3bdbb6e0d6de779f31ee81a0bcb3ce183b907e54a0939a93f708681b070',
                                   'dff3342b2688e65899be266b256b62f06cf4d2d500356cff844c4c8548a146f0',
                                   'f1176b4c80089bd50e6650e364225253eb31f05d82f1c9a02952a7e761c6cbdf',
                                   '54d2fec8bf78c7570824390e25c3c3072c915b5583b3a817bb11c85a0984621b',
                                   'e9d532bb036cf8826ba6d89e916a363bc251a3eaf21f5664401954bf883bf0bc',
                                   'c965077c65f79cbc1f5ba791dc0887463d22e59e9defad262a341cc5458d570e',
                                   'c8acc8ef40d621afbb767061c495f5e2222626c8d3546f66cd7020c2d7467f8b',
                                   'eff153197f0c9914a648b23f00373d322b33d81e85f69a192a810028a1098a6f',
                                   '23deb3e0de3da409489a4ff10927f9e51cf5d166ca502fa532a27e33cd4c0d1c',
                                   'b52e342547309de5f3c53cad6783e3447f2590a5cb5c9eeba181fc41b5ac4bbf',
                                   'f01f1d31414a862d0aa7b89495d3b5064450260a295e675898175f60fe6e52ff',
                                   'a5eec7971c14f3da2a2156db762dde8b4eabf54c0596481c80db7b5959a1ecb7',
                                   '5e23399dcc731e27651809c3b1efbb79fb0a1e7e21c17784aafa0bada24498e9',
                                   '30ca130141db5849047a43f253a225b84bd087322d89c355c78f9eff06cf261b',
                                   'cb6200a3dcc6eb4140451fea93643a7d1d7b06694b8b923abeea3db6604c1df9',
                                   '2bdafcbcdb4107fcc9c895daeb7fd83308832e0a527be0a608b3b07ad1161b44',
                                   '2543e6281c69a44a890b7661fa499b53b1acf81897773ee19dadc1175ae99ce5',
                                   'afeac27b46d2e7ca3cebb5cc294d1efece277f4d5ff76aab958b47b77b9bbf52',
                                   '6fcfdc23666b58d6b8b94d3739271d836af442c40be7f4baa550acb6c32c277b',
                                   '65d1fa75bd6f82fe446d46ea057b648f0aaaaf448b3ad5b9354843111cf6aecc',
                                   'fbba13d23d58c8b440caa729c4d9e3c2f375bb384a0e8d20c978ad1538a32385',
                                   'eaae293ec2ce38e495b8910a8b6edec1a407febfa1996ab3af3fed09230cccd0',
                                   'e90f412f45be67e5cefd54ea6481e1f00c49601c4c7caed0f570a396a1ac96e4',
                                   'f0c1dd0d44cc995c8b69fe24eecfd14bb5ac9937cf4bc07c87ee4b261d0196c1',
                                   '3b26bf3c54e1351d82d424f27d7f7185be706acfcdf95fc25abd1281102d9ee0',
                                   '04557835055b87924ae8aab0e950a1d570c9dbef313d1b3104444a624fe686a3',
                                   '46edb817e42caaa26ba51f58a8f2e3f2681e092cd1e66168818b4da8511abd20',
                                   'd58e77f1badd755b9d84b80c5cef8d0351a8396ff2f12e3e6a99b6b30ebe531f',
                                   '72cde935593a2cac1d9f65da14933b653046633ef840b62bcaff41af1e5f5afd',
                                   '91492080c2fed3933e2f2e43ef81323ba29ad927f38803f542a1b967349d63d4',
                                   '14f12b4dd3ce3cf2620c28a71f6c0560bccfd40a2b4e1da4de5a505fc5b27a72',
                                   '99898e7dd68947a4c219042f4a93019af345e98622976cf4f5482837a81e6617',
                                   'e0c79c676dd798ca54b09bbe63dd5e145cb5c5f615a20e0e5c0f821df7fa66b7',
                                   '9b15b1ea80950c982e6ba80e60877ddf599dd89bc554bca9cd0859a6bcf28d6a',
                                   'ffda5c53589fa1c1f20c2f4de297068904e57b6139454666cfb7d0b2256f524e',
                                   'f4d46b5eb8df419af8fc53127212469dfe9d8afbf866195e8c4f0aa793deb26d',
                                   '2b4117c1b1d6487b8c09a736c360e9a62014d26ce5722c0d3315cf293d562735',
                                   '5ca54252343b64db0c708d209fded71a9bd607b46f8a91e31018cc4398f782a3',
                                   'da482d09136406fe0d8e2b3cc268b15a2cfb3988d383b920247b778ab90b8b0a',
                                   '2b5ea44b7b6a20ba393566570937455b71f281c0e9abd1cba2e3e4fd826f0fcd',
                                   'a24a3644e82abe27e1547d407e254979d074e6796faee973fc79fc7eb6ca4da0',
                                   '8025c43c203f3b01b7e3910bee124deae7583f5a711c1522832740084ef6c04b',
                                   'cbefb2ca03fb594b380e409b86e86982f88083a53edfe6f5cdd0f7bcb637773b',
                                   '71068487abff7b8b95326190c208fc877ef4cb518e45b3b505bdcd937d804a51',
                                   '0f2c917fc2391c44eb3a3c80fdfe94c5730aaba28896a65cde7ed8b8c8dca59a',
                                   '98761734dca099a5d4a6088343b852eb64b8c07b5bde42ae15670b05f93073b4',
                                   'dffaf7fd49d76e6449bf9f156406deecb59a2be79c63b3580c9246fc995d8533',
                                   '66e134f2742c1465db55666abf2cfd9d490fea3e1adfd09e7cb6f6ca4d6b5d8c',
                                   '39664e3c42ee6b44c3555c86996a46ad77e6e30f1776f812a7fee235b3eaf6e1',
                                   '458b59ee336cd8b3e827c3f0cf8f9a982c4606ef8d821ba4864bbe2a817993cc',
                                   '24fcdabe3e11e9fdfb34f6f34776ff7a5432825419c75945821a1cc356ecb3e9',
                                   '3084ea7558a6abcca5a0cbc7198cb16551f6eb3e90c882dabd8fa19323aa5e4e',
                                   '00bcf429875457106d3fc0f004ae3ed951eab4954f99a32877e745cf75ff9df5',
                                   'f834d074751a178d8086f66a50f3b99244120ea8aad6e0a04c2eb7d334850559',
                                   '198e2b7afc1c821c21068c5aa941c0f8623af24f68a54711d552b7c3d0959412',
                                   '223d43ef31d0c75d32172cc403b40ccc90925a0828c2b3e3392eb031cc5db658',
                                   '3ae1cbae6eb65f12a0c69b9da02f7392f224f4aca0cb630e56c2cf24b1e05cb9',
                                   'b6c1de381a1c9c7b22dcfd07fa35ae879e0c49ce2f10ac8b19e8dd36c8e55396']}}
SUMMARY = {'kind': 'canonical_chapter_summary',
 'label': 'Third Therī Apadāna chapter summary',
 'parent_id': 'thi-ap30',
 'first_ref': 'thi-ap30/64',
 'last_ref': 'thi-ap30/67',
 'root_start': 9943,
 'root_end': 9949,
 'root_sha256': '82675860bcd5eda124e7af8c94208c0acd27505f27a79c040a9d5f5ca38c90e3',
 'body_sha256': '5eee21f78cd3eb989886f9835c372e5fb0577544e47814ce590dedc5820da6bf',
 'notes_sha256': 'f35f488a05aa5a3b076740aec60983be6dc0ab7a09a601d82523d1e853cc43a4',
 'note_numbers': [43, 44]}
DIVISIONS = [{'kind': 'publisher_recitation',
  'label': 'Fourth recitation portion',
  'before_local_label': '50',
  'before_publisher_label': '1009',
  'body_sha256': '6ab68e301afabf5df2fa7f7570f0916ccbb8f2999a4f2ec76a012560383bb028',
  'notes_sha256': '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  'note_numbers': []}]

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
    assert commit == SOURCE_REVISION, 'Publisher revision changed'
    assert set(rows) == {'thi-ap' + str(n) for n in range(1, 41)}, 'Unexpected activated source scope'
    # The fourth-chapter harness owns 31–40; keep all historical assertions strict for 1–30.
    historical_ids = set(BASELINE) | set(NEW_IDS)
    for uid, expected in BASELINE.items():
        assert digest(compact(rows[uid], sort=True)) == expected, uid + ': previous metadata changed'
    for uid in NEW_IDS:
        for key in PINS:
            assert rows[uid][key] == EXPECTED[uid][key], uid + ': independent source receipt differs: ' + key
        assert rows[uid]['note_count'] == len(EXPECTED[uid]['notes'])
    assert rows['thi-ap30']['chapter_summary'] == SUMMARY
    assert rows['thi-ap28']['publisher_divisions'] == DIVISIONS
    assert all('chapter_summary' not in rows[uid] for uid in NEW_IDS if uid != 'thi-ap30')
    assert all('publisher_divisions' not in rows[uid] for uid in NEW_IDS if uid != 'thi-ap28')
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

    with TemporaryDirectory(prefix='pali-apadana-third-') as work:
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
            assert bool(data['publisher_paratext']) == (uid == 'thi-ap21')
            if uid == 'thi-ap30':
                summary = data['chapter_summary']
                assert set(summary) == set(SUMMARY) | {'text', 'translator_notes'}
                assert all(summary[key] == value for key, value in SUMMARY.items())
                assert digest(summary['text']) == SUMMARY['body_sha256']
                assert [note['number'] for note in summary['translator_notes']] == [43, 44]
                assert digest(compact(summary['translator_notes'])) == SUMMARY['notes_sha256']
                assert all('[Note '+str(n)+']' not in data['text'] and '[Note '+str(n)+']' in summary['text'] for n in (43,44))
            else:
                assert 'chapter_summary' not in data
            if uid == 'thi-ap28':
                assert len(data['publisher_divisions']) == 1
                division = data['publisher_divisions'][0]
                assert set(division) == set(DIVISIONS[0]) | {'text', 'translator_notes'}
                assert all(division[key] == value for key, value in DIVISIONS[0].items())
                assert digest(division['text']) == DIVISIONS[0]['body_sha256']
                assert [note['number'] for note in division['translator_notes']] == []
                assert digest(compact(division['translator_notes'])) == DIVISIONS[0]['notes_sha256']
                assert division['text'] not in data['text']
            else:
                assert 'publisher_divisions' not in data

        def check_whole(data, uid):
            check_source(data, uid)
            assert digest(data['text']) == rows[uid]['body_sha256']
            paragraphs = data['text'].split('\n\n')
            if uid == 'thi-ap21':
                assert '[Note 1]' in paragraphs[0] and '[Note 1]' not in data['publisher_paratext']
            if uid == 'thi-ap28':
                assert '[Note 52]' in data['text'] and '[Note 53]' in data['text']
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
                    assert choice.get('chapter_summary') == (SUMMARY if uid == 'thi-ap30' else None)
                    assert choice.get('publisher_divisions') == (DIVISIONS if uid == 'thi-ap28' else None)
                if uid in ('thi-ap23', 'thi-ap24'):
                    assert meta['source']['locator_revision'] == manifest['vri_commit'] + '-apadana-theri21-30-v1'
                elif uid == 'thi-ap21':
                    assert meta['source']['locator_revision'] == manifest['vri_commit'] + '-apadana-theri11-20-v1'
            # Source31 gains a separate reviewed English choice without changing its Pāli locator.
            neighbor = tool('get_text', {'uid': 'thi-ap31', 'limit': 200})
            assert neighbor['source']['commit'] == manifest['vri_commit']
            assert 'locator_revision' not in neighbor['source']
            assert len(neighbor['english_available']) == 1
            neighbor_choice = neighbor['english_available'][0]
            assert neighbor_choice['translation_id'] == version('thi-ap31')
            assert neighbor_choice['translation_revision'] == commit
            assert neighbor_choice['license'] == 'CC BY-NC-SA 4.0'
            assert neighbor_choice['url'] == rows['thi-ap31']['url']
            assert len(BASELINE_ROOT_SEGMENTS) == 20, 'Missing frozen pre-change Pāli baseline'
            for uid in NEW_IDS:
                foreign = next(candidate for candidate in NEW_IDS if candidate != uid)
                for request in ({'uid': uid, 'translation': version(foreign)},
                                {'uid': uid, 'translation': version(uid), 'translation_revision': '0' * 40},
                                {'uid': uid, 'translation': version(uid), 'offset': 1, 'prefix_sha256': '0' * 64}):
                    assert rpc('get_translation', request).get('isError'), 'Unsafe owner/revision request accepted'
            assert not ledger.exists(), 'Invalid source identity fetched publisher bytes'
            checks.append({'check': 'All30 choices explicit; original20 descriptors and Pāli ref/text sequences frozen; changed23/24 locator revisions; foreign owners/revisions/prefixes refuse before fetch'})
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
                selections = {1}
                if uid == 'thi-ap28':
                    # Every missing local/global label is still actual publisher poem wording.
                    selections.update(i+1 for i,s in enumerate(EXPECTED[uid]['layout']) if s['local_label'] is None or s['publisher_label'] is None)
                for index in sorted(selections):
                    stanza = re.sub(r'\[Note \d+\]', '', paragraphs[index]).strip()
                    suffix = EXPECTED[uid]['layout'][index - 1]['suffix']
                    assert stanza.endswith(suffix)
                    quote = stanza[:-len(suffix)].strip()
                    result = tool('verify_quote', {'text': quote, 'language': 'english', 'texts': [uid], 'translation_ids': [version(uid)]})
                    assert result['verdict'] != 'not_found_in_scope', uid + ': poem quotation missing'
                    assert result['scope']['translations_checked'][0]['translation_revision'] == commit
            excluded = [('thi-ap21', 'poem-title editorial note1', whole['thi-ap21']['translator_notes'][0]['text']),
                        ('thi-ap21', 'publisher preface', whole['thi-ap21']['publisher_paratext']),
                        ('thi-ap28', 'recitation divider', whole['thi-ap28']['publisher_divisions'][0]['text']),
                        ('thi-ap30', 'chapter summary', whole['thi-ap30']['chapter_summary']['text'].split('\n\n')[1])]
            excluded.extend((uid, 'publisher colophon', part) for uid in NEW_IDS for part in whole[uid]['text'].split('\n\n')[-2:])
            excluded.extend(('thi-ap30', 'summary-only note' + str(n['number']), n['text']) for n in whole['thi-ap30']['chapter_summary']['translator_notes'])
            for uid, label, quote in excluded:
                result = tool('verify_quote', {'text': quote, 'language': 'english', 'texts': [uid], 'translation_ids': [version(uid)]})
                assert result['verdict'] == 'not_found_in_scope', label + ': editorial/summary wording misowned as poem'
            checks.append({'check': 'All10 poem quote positives including every thi-ap28 missing local/global label; preface/divider/summary/summary notes excluded from poem quotes'})
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            old = [{'uid': 'thi-ap' + str(n), 'title': 'Authentic pre-repair thi-ap' + str(n) + '/' + str(ref),
                                    'ref': 'thi-ap' + str(n) + '/' + str(ref), 'offset': ref - 1,
                                    'source_commit': manifest['vri_commit'], 'note': PRIVATE + ' saved ' + str(n) + '/' + str(ref)}
                                   for n, ref in [(23, 1), (24, 1), (23, 43)]]
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
                                    preface = page.get_by_role('heading', name='Publisher preface · editorial, not poem text', exact=True)
                                    assert preface.count() == int(uid == 'thi-ap21')
                                    if uid == 'thi-ap21':
                                        assert digest(preface.locator('..').locator('.translation').text_content()) == rows[uid]['paratext_sha256']
                                    summary = page.get_by_role('region', name='Canonical chapter summary · not poem text', exact=True)
                                    if uid == 'thi-ap30':
                                        expect(summary).to_have_count(1)
                                        assert digest(summary.locator('.translation').text_content()) == SUMMARY['body_sha256']
                                        assert [item.get_attribute('value') for item in summary.locator('li').all()] == ['43', '44']
                                        assert digest(compact([{'number': int(item.get_attribute('value')), 'text': item.locator('p').text_content()} for item in summary.locator('li').all()])) == SUMMARY['notes_sha256']
                                        assert all('[Note '+str(n)+']' not in body.text_content() for n in (43,44))
                                    else:
                                        expect(summary).to_have_count(0)
                                    divisions = page.get_by_role('region', name='Publisher recitation division · not poem text', exact=True)
                                    if uid == 'thi-ap28':
                                        expect(divisions).to_have_count(1)
                                        assert digest(divisions.locator('.translation').text_content()) == DIVISIONS[0]['body_sha256']
                                        assert 'before local stanza 50 (publisher stanza 1009)' in divisions.inner_text()
                                        assert DIVISIONS[0]['label'] in divisions.inner_text()
                                        assert digest(compact([])) == DIVISIONS[0]['notes_sha256']
                                        expect(divisions.get_by_role('heading', name='Recitation notes · editorial, not poem notes', exact=True)).to_have_count(0)
                                        assert [item.get_attribute('value') for item in divisions.locator('li').all()] == []
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
                                if uid == 'thi-ap28':
                                    assert all('[Note '+str(n)+']' in ''.join(combined) for n in (52,53))
                                assert requests[-1]['uid'] == uid and requests[-1]['translation_revision'] == commit
                                if len(whole[uid]['text']) > 6000:
                                    assert part_count > 1 and requests[-1]['prefix_sha256'] == digest(''.join(combined[:-1]))
                            for uid, label, patch in (
                                    ('thi-ap30', 'revision', {'translation_revision': '0' * 40}),
                                    ('thi-ap30', 'owner', {'text_id': 'thi-ap29'}),
                                    ('thi-ap30', 'raw source', {'raw_sha256': '0' * 64}),
                                    ('thi-ap30', 'terms', {'license': 'CC BY 4.0'}),
                                    ('thi-ap30', 'poem-note ownership', {'translator_notes': whole['thi-ap30']['translator_notes'] + whole['thi-ap30']['chapter_summary']['translator_notes']}),
                                    ('thi-ap30', 'missing summary', {'chapter_summary': None}),
                                    ('thi-ap30', 'summary owner', {'chapter_summary': {**whole['thi-ap30']['chapter_summary'], 'parent_id': 'thi-ap29'}}),
                                    ('thi-ap30', 'summary root', {'chapter_summary': {**whole['thi-ap30']['chapter_summary'], 'root_sha256': '0' * 64}}),
                                    ('thi-ap30', 'summary note ownership', {'chapter_summary': {**whole['thi-ap30']['chapter_summary'], 'translator_notes': []}}),
                                    ('thi-ap28', 'missing division', {'publisher_divisions': None}),
                                    ('thi-ap28', 'division note ownership', {'publisher_divisions': [{**whole['thi-ap28']['publisher_divisions'][0], 'translator_notes': whole['thi-ap28']['translator_notes'][51:53]}]}),
                                    ('thi-ap28', 'division identity', {'publisher_divisions': [{**whole['thi-ap28']['publisher_divisions'][0], 'before_local_label': '49'}]})):
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
                                if item['ref'] == 'thi-ap23/43':
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
                            page.goto(base + '/#read?uid=thi-ap24')
                            segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                            segment.wait_for()
                            segment.get_by_role('button', name='Save passage thi-ap24/2', exact=True).click()
                            fresh = profile(page)['saved'][-1]
                            assert fresh['ref'] == 'thi-ap24/2' and fresh['offset'] == 1
                            assert fresh['source_commit'] == manifest['vri_commit'] + '-apadana-theri21-30-v1'
                            saved(page, base)
                            bookmark_link(page, fresh).focus()
                            page.keyboard.press('Enter')
                            page.locator('.passage').first.wait_for()
                            loaded(page)
                            assert page.locator('.segment-label a').first.inner_text() == fresh['ref']
                            assert page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text() == metadata['thi-ap24']['segments'][1]['text']
                            audit('fresh revision-pinned bookmark roundtrip')
                            checks.append({'width': width, 'theme': theme, 'check': 'All10 explicit sources; paginated long poems; exact original notes; separate preface/division/summary; 12 drift refusals; old23/24 locator refusal/current review including vanished23tail; local-only drafts/export; fresh24 bookmark'})
                            context.close()
                    browser.close()
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(event['ok'] for event in events)
            assert {event['url'] for event in events} == {rows[uid]['raw_url'] for uid in NEW_IDS}
            report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'publisher_revision': commit,
                      'previous_metadata_baseline': '3854b43', 'previous_metadata_preserved': len(BASELINE), 'previous_pali_roots_preserved': len(BASELINE_ROOT_SEGMENTS),
                      'chapter_summary': SUMMARY, 'publisher_divisions': DIVISIONS,
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
