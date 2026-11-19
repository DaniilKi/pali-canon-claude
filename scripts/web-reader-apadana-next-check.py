#!/usr/bin/env python3
"""Actual MCP/browser checks for the ten reviewed next-group Apadāna additions; pinned local bytes only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
from tempfile import TemporaryDirectory
import time
import urllib.request

from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_APADANA_NEXT_ā😀'
PRIVATE_MARKER = 'PRIVATE_APADANA_NEXT'
NEW_IDS = tuple('thi-ap' + str(n) for n in range(11, 21))
BASELINE = {'thi-ap1': '638d3e4b302e259cb18c2f2164373c0ddaa0073fb07a1d2a5457607ef287b7b2',
 'thi-ap2': '1bed49287d4dc1089c273475fdd7ed1c714d10d6f9bf844a07b27897724c944b',
 'thi-ap3': 'e7fe6e215b9f123c001a93b2e488f2c2a8f2022699f6169029a0a3effc907ce7',
 'thi-ap4': 'fd2d3dc5d57ca79e2688888c0b6da08eca02d117aefabb41532a0906e2957fd1',
 'thi-ap5': 'e6cb125378a546911b8348edfb5e30da13c24129a97e83cefeb7811ced63f9ad',
 'thi-ap6': '7748af5daa3e4d149fc8f9ea8d0d1be6dc0f0f5e93b90577aab9a42c7786a2b8',
 'thi-ap7': '58cdffbb119abd6b8c1226ddfe08d0487514d13a1ad332cd894f06ef539c400d',
 'thi-ap8': '2074f7d98be420ab240540c03cd1303c883f2eea4658cdc450b1dd0fe6361c5b',
 'thi-ap9': 'e92139ffd441fc1ec7f22478cb1967e26e86f4c7809f5e011f13e5603a3e5d40',
 'thi-ap10': '58d616df848ae1261f8c1a96ae8e46f57e41c1dfb1e58e115c8faa35d311ebcb'}
BASELINE_ROOT_SEGMENTS = {'thi-ap1': 'ddabd8e8f24c2b850e607a6443a0651b2a7e8748cdbfd1a668533b26bf55b00d',
 'thi-ap2': 'c08c7ea7efedef12854458d6da74b3790dd1258acacba859ba24697d920aa24d',
 'thi-ap3': 'af3126db90786e1422de0bce8e2f1bf48c815f74b67f79a399b669bf80de5278',
 'thi-ap4': '4175bff910b0b5309455805daeb516816d85012606957aac158ad822fb0aea33',
 'thi-ap5': '7639c8013ffab0f3af88d8824f3bf6e2ef43f17571c3e14147ba795fcb1f1c80',
 'thi-ap6': 'c30bb4310a3c81514ce881e7a45ab727e02767479c81cf30e7da0b53e507004e',
 'thi-ap7': '18075ff3b6c076a7869ca1855228ac06ede0c719b039e0a982e76de1bb509dd9',
 'thi-ap8': '1db6d59bfe31d03dd1ad64377aaef92d57c3f7f963ef6572d6665e47a99ad3aa',
 'thi-ap9': 'd30e1c7c4558957c487106fba738b59669671f920395d51d4a2dec47f72a3c26',
 'thi-ap10': 'a4d8ffe6cceee538959eb3e4e1012cbb571e2c1f69e2520040e79b1a30b4857c'}
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
EXPECTED = {'thi-ap11': {'raw_sha256': '73d6881ddc2554bc4a0ed3433eb8b76d2a17f8a60a8233d0d178c6a7b276a8e5',
              'body_sha256': '82b4b8d0d958c21c889b04b5f0eb84ed9daa8ead711c81f8d8962b1d6c395095',
              'notes_sha256': '44a57580db2d21a99ffd9be0ba261ecb4b02a309b2a92f40a84dd7daa5318d2a',
              'paratext_sha256': '82c8d817b70123bd81092f976be1ab27f8a11a85e5b6f0254f4d92dd8405dd4a',
              'root_sha256': '164aa615f8ae1aaeef438d86c0502856fa58c46f9c3f0e9882fcefc8ccfdc16c',
              'notes': [1, 2, 3, 4, 5, 6],
              'labels': [('1', '131'),
                         ('2', '132'),
                         ('3', '133'),
                         ('4', '134'),
                         ('5', '135'),
                         ('6', '136'),
                         ('7', '137'),
                         ('8', '138'),
                         ('9', '139'),
                         ('10', '140'),
                         ('11', '141'),
                         ('12', '142'),
                         ('13', '143'),
                         ('14', '144'),
                         ('15', '145'),
                         ('16', '146'),
                         ('17', '147'),
                         ('18', '148'),
                         ('19', '149'),
                         ('20', '150')],
              'paragraph_hashes': ['e8018e43cb7da1c9b53d8261b5caed908d306f982eb9defaa122112db0faaa4f',
                                   'f77be0643072cc9357ddab6975bc79f586b152c8714b1dfe2638233588361264',
                                   '895fbcce76abb04ee5f0ff56c09d3ac77ceffe24ba4b75426b438d1237c60c29',
                                   'da1ccf159c41fc16c3be1b4037787a41c722c12c2b450a809ad6b18cf66a596d',
                                   '79309f1439bd79b6b7cd1e634cdd57df9c7e28077e14742ca249d3472715afc9',
                                   '6c78a734fb0f53ed61acb49e84089eb1f41f7770a8bd921f2303d9555fa60c84',
                                   '567d98e595758ad9b39b0aa640c0222e8092e682717c4dfaa71f9935d0210add',
                                   '8ede06cf59985717da55aba83e72e784c661090e4b712f7b75dfe6c7c30c1e06',
                                   '640b277490b6960498217050e276c345abbd715730158f0fdf6dbb8979fdf806',
                                   '2bcbe93d345f5b77b40c6683fdcb81a183e30cbc4883579893e1960a02de5838',
                                   'c18caeb989266aa750c21917508620c4f29ad4841763062a5971822d7c2523e7',
                                   'dc8a4dfed400710ae8d93dfe155873597ceb3f2a4f28abe486f46205b095487a',
                                   '10a33875dcef467bd903423f4fbfdd27aa14826b8e8a595ab1d84c729f6ed554',
                                   'acc88ba5d2ea4270b24507eea1d1de62a17fa5df5da3093a560cb00d8aacae3f',
                                   '95470e8dd98b4a3cd9fb77e20524c67d3c21da170f87883b2a06f4e56b554491',
                                   '9c32f054c76616beba76968e5fd5d6e3c2655671defdf5990b5dd6f2c49f1a12',
                                   'b8977ed25d52b54e8d10230808ca476ea29b45c1a191e9a2365c24e39e440afb',
                                   '5194c1d58204099bd3b6e2547d27a3c8cb235d45e2dd23ca73a40839e5eb6bfc',
                                   '28b89dcef927906e016a5dc178c9e6055afac9ade30347ce4d08da2406ec629b',
                                   'c852b6d11c60b5a0071db41805557897e75ff31828ae4ab6abcf4c3ff77dedc3',
                                   '37ed4e9635e8c5d2987cb7a79dc3df439121cc8f09a3518d6212bc077c8e8849',
                                   '201b7827d8691d68b4774f00387c35347cf1d044e5577c5c01ebc2e897581cfd',
                                   '0c3a3218d48468a036df05c5a568c8d2a87fe7fa552367705270584716962611']},
 'thi-ap12': {'raw_sha256': '644b0b233faca1f34be5137e2cbbb770f5f7701f9fd205f09185a80879cb58c4',
              'body_sha256': 'de1dc7f05a6f97c0d3f0a04f97859af4041f2a8ddea95e2b611b3fe587c5c04d',
              'notes_sha256': 'cef930ded8b688cf28b2e8da561b5cfa8a28fcbfc939f0fe6550524f98d004a3',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '2337078d99acd9c3b912ac2106801d7d24cb9294ec8043c1fbe4928fc7a5e103',
              'notes': [1],
              'labels': [('1', '151'), ('2', '152'), ('3', '153'), ('4', '154'), ('5', '155'), ('6', '156'), ('7', '157'), ('8', '158')],
              'paragraph_hashes': ['4b789264aaa28de24a768c53e628942fdb064b5950b320fee035cc83a9e53d60',
                                   '3fff952e83a3575f372c198b3c7c65f1cb5d5f360f43a75c648ba3dfdacec1fc',
                                   'd0c30f85662f4fc893b7f95e561964013929af4bb12d7af42ec0ee13d82e78cb',
                                   'bca888ee9df5d9cb5a849d11afd3348b7706bfa18fcb414a59916af3ffbf2574',
                                   '1538a0065c10f8d7da46fa4327037a075372555aaa9583a31c34159134aef44d',
                                   'aa1e2b49d6c76850b472c0ae9612ff43e586094222c4c77ff6755098c9d75801',
                                   'ea003d699ac106593977150ff2c95a9f3d94183279defeb094440049cd1693a2',
                                   'a479f1d13e7cd5ec454cfd5d2eec38359d2ac76b966b4c7f9e2addd9d5f3f6b8',
                                   '54a51ee87600edbde3a8fe7c6305bd49235d0ba998d5cefbf0def3c0fbe25333',
                                   'acadc52c6039251f4e36fd2357df6517e17910800012ea30a0409d0fb6dbc806',
                                   '69e19d8280caf1a8961c2900c812c068c63a168aa8da03e4565c1e4daeeee778']},
 'thi-ap13': {'raw_sha256': '86d93fbcc8a5bfa8658699cac30831749642f9016a9d73ce2befee1982b70c36',
              'body_sha256': 'd10795670fcfe35c8bd0b507d95b9266b7bcbe588022ae93e403f3169e749706',
              'notes_sha256': '2c31bd5e9461d7d3a196f8d3fc77aeedcd6328d6a0b05a5cf882601ff53b9477',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '2d6f846b1a513cc8e9e728a61d9a40492d0cb5e86911ab45904c9e169b23be79',
              'notes': [1, 2],
              'labels': [('1', '159'), ('2', '160'), ('3', '161'), ('4', '162'), ('5', '163'), ('6', '164'), ('7', '165')],
              'paragraph_hashes': ['58f5627d4a2b2fd2d5b174e2a24198b8a7559c7ea14cbb2c2cb0460bb08a733b',
                                   'acbde0cf77ef9bd3f405a98f0e77f656f270c8d283479ec3c94d72eb8610113a',
                                   'f6ef1331c9b811b3a1a64b87e4c37a7275a0b213c1fd938f1bbba71711dd991b',
                                   '3c09a4ac8935303d77b608ec4d275e224073eb4954059f732d0d796ef99343e1',
                                   '01924864b6dcc95eba21f0e9e4e662f291ab9347c4e68bac6daa7e360c86cf64',
                                   'e78e129ab770757c240d0ecf2ff3bd48da9714b12bcde14f9889d1f6ab78d7e1',
                                   '6b48f101fb5f8b4e464e64224d5790312954dfacf03c27830145c4eb44eb8fb9',
                                   'f46675860763859d977ab1db6bd2051d4a34fdd086fb6bbcf99016bbf90f083e',
                                   '9ec1c58fc233d2e4774e2238d1f3b68d1f290366efcbbd01a2801f2d7bec25e6',
                                   'de6f63e881433960ae616798d1af34b9f70aabf0dd4d90a81a6ed81fc27e1d06']},
 'thi-ap14': {'raw_sha256': 'ad3e984cd8feac560d92dc27d74266f9d925d29c72f3806d88ac618ec345685c',
              'body_sha256': '7a81c5fc934587d2be7453f9b1989ee17b405aadab8e74c9a069fcb439c4ec53',
              'notes_sha256': 'b3bab216e6ad0f8fca9d4bacf153b1aa20581969c60eaff7bf01874d9791606f',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '9a69373d3af38c4a7b8cf2b77774d2d1fa10a3b9349bb2d3a710eb8c04cfeb72',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
              'labels': [('1', '166'),
                         ('2', '167'),
                         ('3', '168'),
                         ('4', '169'),
                         ('5', '170'),
                         ('6', '171'),
                         ('7', '172'),
                         ('8', '173'),
                         ('9', '174'),
                         ('10', '175'),
                         ('11', '176'),
                         ('12', '177'),
                         ('13', '178'),
                         ('14', '179'),
                         ('15', '180'),
                         ('16', '181'),
                         ('17', '182'),
                         ('18', '183'),
                         ('19', '184'),
                         ('20', '185'),
                         ('21', '186'),
                         ('22', '187'),
                         ('23', '188'),
                         ('24', '189')],
              'paragraph_hashes': ['5f00fe06dcac87cc74a73a8ce76d3d3d9a159f53dc67edf1032957867eb6820a',
                                   'f01449d8ec72fb8096bc12c7f28977443bd62b0849cb4352fd2d22d165c28e0f',
                                   '2e18479f05958fe8d85286e86883f40c8d07fad6d42b59975eef9a144288fe89',
                                   '611cc2defe63d2697bc8d06793e1006bce13100e0df8843e3f9bae5e093611dc',
                                   'dc17047a0e7ef16490607929e6ccea12ce545376c1020f25440d7f2659f8c727',
                                   'a150263d058db2e9b5425a7f988b3af9c33904d1e59b9f39446e44a5d8c1e57f',
                                   '6f42199e9ed3826ec2655bb1739e6cdde24cdc5e68690f1bc565a92506bea99f',
                                   'b809b3ebf425fcf6903f3f13407f3ce6a12775f6f447b545c7ac7c6ab740e437',
                                   '0e816e847ec257900f0e30ed25d24b55e7ca47fa2804c5a94fbb4943b365440b',
                                   '12403d309ea47c5d506c1eed434eaab4717287b71ebfda80cb0fdd35043ade02',
                                   '562d815a61f8d2f347506fef929c48f54031ff39d74738329a53d20896f7c38b',
                                   '799a99242d7e88f6363f0869429931ad6ed675118723160867759e32892eb286',
                                   '1e61d71cf214f76907ef580492d388b4d06cbe8e859a91d3d30ca8fd16833045',
                                   '9811ca08bbc4ea77801b14188436d3b723e934000669c03e011b26b79c3bd29e',
                                   'b20057b09a9641c79e01fae54f3c62673e7ae9a47ad8454529c066a4d57d3613',
                                   '4604305a79d45d59a4d1d6e9fe6f5e3bc41f88d8ac898da3dba3275a514ecf98',
                                   '9020830765454c16510be79ff3237c623d0c3d9d1cb95c24e8bcfea41e9d9fb7',
                                   'a1f6de9cd0cacd2dc6a940b3a7bedbd256fc53d61000d0181bf53926f311e2f1',
                                   '044796579ba191b7ed52fd121089dc75579acff097c11a3d9eb7d0298b10badc',
                                   '3f9fd4a4752839218419550adf6366e3b691c8c22f0b66e83fac453f5e092641',
                                   '5606a0b2f9ded8accdd52c21379bf78f839e6648bd16c9f2411f5567f3315545',
                                   'b75d4e5491df6d5794455bfd0b386380be9ebce43659b925f2c2468a148f2f64',
                                   '3a4b053eef87d7ec4e3f900b8eba9adf1f5666e522c75578d1b3289dc97c02ae',
                                   '3da4afe7754637492c1b0f06138d97c100cd52829037fff4299c953e6b3ddb9d',
                                   '29cb7c80642b03ca478dd3a11ef4e0e64ccee28eb9cbd5e176a96cc052d32bb5',
                                   '6e4645d4412c194ab6dae48f165eb762719a8b785c85216991ce6fdd961cfce9',
                                   '2c7cf1808c3e5587f1e42eb3dd263a19cdd7f8abddca70db7c0e6e66520702ab']},
 'thi-ap15': {'raw_sha256': '82c0f4fac1a60ed18c850ae3849e99234d20bc986c16c1de1a38a82fd61cfbb6',
              'body_sha256': 'b55552269aec0ac7349e5212c825c81458d47321b2f567ac5e3943e6dff29a29',
              'notes_sha256': '14bb482c913ed61d83fba45962dc5af6ee543b1a2f10ca6a8f0eab05ffbc00e4',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '315579ea2da355a265b62145a875ffe46ae56bbbaf9aaa0657dd735fd3010459',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8],
              'labels': [('1', '190'),
                         ('2', '191'),
                         ('3', '192'),
                         ('4', '193'),
                         ('5', '194'),
                         ('6', '195'),
                         ('7', '196'),
                         ('8', '197'),
                         ('9', '198'),
                         ('10', '199'),
                         ('11', '200'),
                         ('12', '201'),
                         ('13', '202'),
                         ('14', '203'),
                         ('15', '204'),
                         ('16', '205'),
                         ('17', '206'),
                         ('18', '207'),
                         ('19', '208'),
                         ('20', '209'),
                         ('21', '210'),
                         ('22', '211'),
                         ('23', '212'),
                         ('24', '213'),
                         ('25', '214')],
              'paragraph_hashes': ['1fd20736668ce9f5fe76f833d6571922c2cc68b4ddda850317b492cabd732ea2',
                                   '11948225d2b39850ce40c2264e799bc886e439a0ccae29fd91d426bbcdc1ab55',
                                   'ccaf2d3879f940db5ed778a925b82940b2df46879077835018c1bf15d2169b43',
                                   '6a93c7ffad43658b542fe6200aab4035be8ac1572df33ac717834837abbedd4d',
                                   'eda794fe73f9e81c24e9a0d98693d4026ceb83243d65261d31bcca56028fd971',
                                   'c01c5809ed0974e24adc1ebd4d288be8b610b9a3b94b5fb3cbc7007c093b2898',
                                   '5d8825dd3b5721600c2c985b2c6c50428eae6da8add60cbae38ef4e75ce32783',
                                   '4bf19b9b82914629561eef5c5ffcf7c036031b0c90012c1b06c8d9987263a423',
                                   '8f490a5d0b5023204b54a7312ebf75f120cd5ae858a177fcb8fe91e34b041ed4',
                                   'dd1341c2b8e5060cf96e070142ecaed48414c17ebb0baf008283a17ca5a052a2',
                                   '5507816f93e4da2030bea44efb64be0663f4c1040b04ca557384fe9c844028ba',
                                   'cacc36510131e98dfbccf33bd415863f2e7eda82c2b1e7e38ae4d4f52dc261bd',
                                   'bb48ca657889d8e2e044d3d97331c06d86155546f6458f75b21770b8551f80d8',
                                   '0204c43bb940ae46745510fe9338f2a72b33f4136d23501020f08fc1782534db',
                                   '8c07933d53b6e72f228b4cb2183841145ecda2cf3bb48849a18ef19b0f8b6227',
                                   'db3499c1c36c55a0348fc7026da9bd065bdd5880ddcea65b37f6b1eec98c76d4',
                                   '6ff88bdd1eb876cd354ef09cc4af193d4d89a147ff7e52f52b413415bdd83102',
                                   '2c06ea431a4bd933d4a5a688be5c4e72bf10dc470e7cadc1a76db4c08c3ed8be',
                                   '4640635c998757144c33297bc4fe68e03055deb0250c274f5e235f82eb70b015',
                                   'a5fa73ecf6a0b5ef047cbfec48d30fa5a4086751e0ecb99837527d8a5b2e9afc',
                                   'be08d90174b8a67548e80731cb67312d5f2c43fc743967d07eb3e9c4f17b7bb7',
                                   '243e3d08b01e39cad9ac3dd02e2a5b21f25951944686c8d6ac66a494c98292ad',
                                   '96d9d59ff071e3c5bb31a3e51fa8c46880d61b30e6151575962ef7abb075c161',
                                   '1f9d23086ea25e482ed9c13c131586050387809cfcd19a820e796d45dc17cb6e',
                                   '1297eccd0f2310ea26e71598c66828b1364077a02b5e3c3b2e6cfe565a0433e5',
                                   '4446846fbdeb4d9089cc5b678eebdb231247044d682d891896341062b6913b38',
                                   '3dc3c1f24f16db7a6d47ab7955d19da34c02cf4cf2f2000949e5b35d39943a3f',
                                   '2254ce6f6e7e9c60bb99e6df97b6c9c28e83854ddeb42ca8d25b3d286a3dd861']},
 'thi-ap16': {'raw_sha256': '961c914d4b392296cf0d385c056f0c1670b95aa923bc62e3500461e8cc721838',
              'body_sha256': 'b5edfc8c21bd6c907b59735f6926db91a2d55312e7ece492cea9c44cd1b0c0a6',
              'notes_sha256': '77fd26d21439906b5600d354e70a4ac8e10fc465d8c4b76505790f5426be1bd1',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'a3e30dbff9432a9c3c02bfa8f090fa2020811bc635c3f356cd1f86a271320289',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8],
              'labels': [('1', '215'),
                         ('2', '216'),
                         ('3', '217'),
                         ('4', '218'),
                         ('5', '219'),
                         ('6', '220'),
                         ('7', '221'),
                         ('8', '223'),
                         ('9', '224'),
                         ('10', '225'),
                         ('11', '222'),
                         ('12', None)],
              'paragraph_hashes': ['8c102e8691d3080f130668b29a5a9fae9608405f36ac14ae9f9e46d0c9290e93',
                                   '999cb7469c4de13bdeab1e22d99d16d30da68774b10cdd340e5a10bcf6612e03',
                                   '0e09db627f1f643b921adf8706704e6701d1861073757a5a23fbaf516683df1b',
                                   '49f7f77fcd15cea71307de0a0b5b084c225b693eefb4c8e3bd68a94ac3f52169',
                                   '20ce70ac13a8fff864365af982dd980d603eb7a85e8a8d67f6e32877e5a4e84f',
                                   '7d119b988c57b3c5c6535bc049bc8781356dd9cf37ab712b04bfe397b3796802',
                                   'ee572c683674408823980457718dd69e4567ad1b09a41576ccec61e8f03cd957',
                                   'c1476196b5ccd95d3513bf0fb26b75b7ab369c297613411281f6f95123d777fd',
                                   'e58f925a84859c08f786684a1b16a514c3fe1b5d06be3d364a356ebc91db911d',
                                   'cb18d5a7d98a0e930a324efa8573a05bddd816be8b4f6d54c6ac084f3251bb98',
                                   '092336ba86e6a82444c34d9c6838966c8cf049276fb4f1564089d55a88056351',
                                   '0e29519dc05a0eaad17e5a4daeaed9b0d508a586586a9e55ca608cbdf1a2eaf4',
                                   '926f4e889a5ae17edcd5d9b8fcea5ac3c2575b9f47c19855cf26a3ed15c234fd',
                                   '215ff93ed797007247ee9398766b18bd28ab8feb61c9b9ace121df930e2d22db',
                                   '63ba434d38adc0b573cf10c4512a85a74202b31cb728ed4175161a8004ea8d34']},
 'thi-ap17': {'raw_sha256': '483d1147155da827d0a64aaae4ccd78ce5916ef3bb89dcf55b6f94831ed300ab',
              'body_sha256': 'ad425e6f9380043a880541747de30038f52f7dcd3c9551cb99fa694023867499',
              'notes_sha256': 'be2abf60b810f8f927660b2d0d0377e0f8baec242c8804278af670eca5a21d0a',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '483fc05030a8ae4c74145634b8d9ae9216fa424c5bda2042b7e950b191b6adea',
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
                        75,
                        76,
                        77,
                        78,
                        79,
                        80,
                        81,
                        82,
                        83,
                        84,
                        85,
                        86,
                        87,
                        88,
                        89,
                        90,
                        91,
                        92,
                        93,
                        94,
                        95,
                        96,
                        97,
                        98,
                        99,
                        100,
                        101,
                        102,
                        103,
                        104,
                        105,
                        106,
                        107,
                        108,
                        109,
                        110,
                        111,
                        112,
                        113,
                        114,
                        115,
                        116,
                        117,
                        118,
                        119,
                        120],
              'labels': [('1', '226'),
                         ('2', '227'),
                         ('2e-f, 3a-b', '228'),
                         ('3c-f', '229'),
                         ('4', '230'),
                         ('5', '231'),
                         ('6', '232'),
                         ('7', '233'),
                         ('8', '234'),
                         ('9', '235'),
                         ('10', '236'),
                         ('11', '237'),
                         ('12', '238'),
                         ('13', '239'),
                         ('14', '240'),
                         ('15', '241'),
                         ('16', '242'),
                         ('17', '243'),
                         ('18', '244'),
                         ('19', '245'),
                         ('20', '246'),
                         ('21', '247'),
                         ('22', '248'),
                         ('23', '249'),
                         ('24', '250'),
                         ('25', '251'),
                         ('26', '252'),
                         ('27', '253'),
                         ('28', '254'),
                         ('29', '255'),
                         ('30', '256'),
                         ('31', '257'),
                         ('32', '258'),
                         ('33', '259'),
                         ('34', '260'),
                         ('35', '261'),
                         ('36', '262'),
                         ('37', '263'),
                         ('38', '264'),
                         ('39', '265'),
                         ('40', '266'),
                         ('41', '267'),
                         ('42', '268'),
                         ('43', '269'),
                         ('44', '270'),
                         ('45', '271'),
                         ('46', '272'),
                         ('47', '273'),
                         ('48', '274'),
                         ('49', '275'),
                         ('50', '276'),
                         ('51', '277'),
                         ('52', '278'),
                         ('53', '279'),
                         ('54', '280'),
                         ('55', '281'),
                         ('56-57', '282-283'),
                         ('58', '284'),
                         ('59', '285'),
                         ('60', '286'),
                         ('61', '287'),
                         ('62', '288'),
                         ('63', '289'),
                         ('64', '290'),
                         ('65', '291'),
                         ('66', '292'),
                         ('67', '293'),
                         ('68', '294'),
                         ('69', '295'),
                         ('70', '296'),
                         ('71', '297'),
                         ('72', '298'),
                         ('73', '299'),
                         ('74', '300'),
                         ('75', '301'),
                         ('76', '302'),
                         ('77', '303'),
                         ('78', '304'),
                         ('79', '305'),
                         ('80', '306'),
                         ('81', '307'),
                         ('82', '308'),
                         ('83', '309'),
                         ('84', '310'),
                         ('85', '311'),
                         ('86', '312'),
                         ('87', '313'),
                         ('88', '314'),
                         ('89', '315'),
                         ('90', '316'),
                         ('91', '317'),
                         ('92', '318'),
                         ('93', '319'),
                         ('94', '320'),
                         ('95', '321'),
                         ('96', '322'),
                         ('97', '323'),
                         ('98', '324'),
                         ('99', '325'),
                         ('100', '326'),
                         ('101', '327'),
                         ('102', '328'),
                         ('103', '329'),
                         ('104', '330'),
                         ('105', '331'),
                         ('106', '332'),
                         ('107', '333'),
                         ('108', '334'),
                         ('109', '335'),
                         ('110', '336'),
                         ('111', '337'),
                         ('112', '338'),
                         ('113', '339'),
                         ('114', '340'),
                         ('115', '341'),
                         ('116', '342'),
                         ('117', '343'),
                         ('118', '344'),
                         ('119', '345'),
                         ('120', '346'),
                         ('121', '347'),
                         ('122-123', '348-349'),
                         ('124', '350'),
                         ('125', '351'),
                         ('126', '352'),
                         ('127', '353'),
                         ('128', '354'),
                         ('129', '355'),
                         ('130', '356'),
                         ('131', '357'),
                         ('132', '358'),
                         ('133', '359'),
                         ('134', '360'),
                         ('135', '361'),
                         ('136', '362'),
                         ('137', '363'),
                         ('138', '364'),
                         ('139', '365'),
                         ('140', '366'),
                         ('141', '367'),
                         ('142', '368'),
                         ('143', '369'),
                         ('144', '370'),
                         ('145', '371'),
                         ('146', '372'),
                         ('147', '373'),
                         ('148', '374'),
                         ('149', '375'),
                         ('150', '376'),
                         ('151', '377'),
                         ('152', '378'),
                         ('153', '379'),
                         ('154', '380'),
                         ('155', '381'),
                         ('156-157', '382-383'),
                         ('158', '384'),
                         ('159', '385'),
                         ('160', '386'),
                         ('161', '387'),
                         ('162', '388'),
                         ('163', '389'),
                         ('164', '390'),
                         ('165', '391'),
                         ('166', '392'),
                         ('167', '393'),
                         ('168', '394'),
                         ('169', '395'),
                         ('170', '396'),
                         ('171', '397'),
                         ('172', '398'),
                         ('173', '399'),
                         ('174', '400'),
                         ('175', '401'),
                         ('176', '402'),
                         ('177', '403'),
                         ('178', '404'),
                         ('179-180', '405-406'),
                         ('181', '407'),
                         ('182', '408'),
                         ('183', '409'),
                         ('184', '410'),
                         ('185', '411'),
                         ('186', '412'),
                         ('187', '413'),
                         ('188', '414'),
                         ('189', '415')],
              'paragraph_hashes': ['659e3ec4c050380afd3772117aeced58cb337ff4899c69701be46ebaedb82dac',
                                   'e428bef42c563dea35780d093dc27e7dff61b5f65253746d211bdf37fceeadc8',
                                   'e2bc4eb8f3ce9f2523949139e1f119af480e458cba1de12b071b12b08ce5a71b',
                                   'f513246a62b88fb8e41eb556b988f2922ceb0454117bdfe4095da1d4e76a9540',
                                   'f4964c0df75257a3f26904dff2c194844eb26d8bc67a8aa447ef00fab6af4ef4',
                                   'a3e31242f1681c792635b2a1d832923dbaca02e8bd2f3a77ccbc481debb1dd0e',
                                   'd13b2b78afdde4793d9c2d72dc1ca00bf96ba4f8022909e5ea9134bd52278369',
                                   'f7e22561d8152b5e1d94555c557368392c91279ea63198ad07ef7b7eea89a6f8',
                                   '1d1a5a746f6c0426c82136f7fd1cf2bda8c2f54ad9ff25a777eb4b53ff1d2e11',
                                   'd114c590336398306d8e827c1529cffd56cf19b73802ddda51bb4dad5d559043',
                                   'b24233cf4d9192a4169e4cd8e676e76e9a3ac760f51984a458fabc048e9e7f09',
                                   '4bf0386db643397b0290ea995b18e3913286cb735469ee57d1db12c4aa79611e',
                                   'a3bd231e9aebdbed8b44cfd41a7248edcb03e9bc7c99f77e3e738bb108cab0bf',
                                   '0afa165e1073cc8cc6cc31a6afedab8d36355e24031469cda9c3cde67d8e983f',
                                   'f59d61f76b30c2cbbdbcb413ebbc90a32997fb37ba3b25c197dbe55a1b485bfe',
                                   '1baec19dcabf1f12c9a488693ad6bc1099e70d6814095ef6f6f509662dccf9c2',
                                   'f1d8870de6cc3503606a78dbc695fe323607f16cdbb6f018a2f81fbbbed063b9',
                                   '72c1e9714491e6a4dcbea0ebed38050b6f4f2a090358c334b6dbf90973a91427',
                                   'c63725502732707f20499bb96c0132799c547e992d0ab6e7d29f13e82943f962',
                                   '5722b904a858de397996d41e4caa469a57d5c125c506b8465f5d9e09dfafa7d5',
                                   '2a108ecf67043509be4305367cc268e5ca89b7f3897a02a41d6873e9777cbe91',
                                   'e13b5961f0b9518cb2305bcb70ebd5322051f61a2f83a0c29e752dadd9ee1e62',
                                   '81f00e7abf6bfaeab4a1fb13e809a384c89ee40da58183d088411cc77f139994',
                                   '12efaba635f98b35b34a2c939f468b841368fdf6af057dd90f0152a2180b48d1',
                                   'eae43346b8fea948d0302c84f7b32962a588a982453cddec980cf4799b7b2b8b',
                                   'e17a7c0613d986017f38643bda8ccd453b17da8266d5117eb1ac5a5d232bc517',
                                   '1b2356f7ad5da9fd3c732205195e416e438355917127d129914b9075cae3d09d',
                                   '9abdf0b6df830ec96150f21707c4c65b63f1edb10aeb75952b2863ef3caf0d2d',
                                   'aa995f2ea35fab4e13daa4b03017ab20dee7391df918fa5e77afc6af8005aafc',
                                   '2c3f9e32dedcf8ff2f2630cd344dd228df7a48d7cdb4fa45b482f9f19ae603d6',
                                   '60f546db3a6296069ab912428eb2e571a0cd4cda4c00d6c4813b8058c88f5f1c',
                                   '6a0e88021072cf22a05a441e97e323324dd7e1291a6e62838901466369749342',
                                   '3a0790a43a67b0c09d6c9c93bf51b1d093a4cf14dccbb0fb339c84d1f109278d',
                                   'ecd08027a8c76fe8e330eea12e570756f542add8e8504fff843ab946cdfc8d69',
                                   'd3ee1f502d0d045661d9c3b9fca09675aab3afcc25dbb16f2efee45c2581a6a0',
                                   '03886adefb052cb8b0e7f71cfa58c5961c76c534fa61295178b8eaa4824e9814',
                                   '74cd1b97dff431f6e095701459c6c6b7213617665a0b329f372bbdb91e60d12a',
                                   'bb23018304f913e03317967c53a555304336f27eecc35ec8adf5c46e4219a273',
                                   'a74bfda48b08fa36a4cd26865f3a77812ec7ed6c79fd97fe2b5e0ebcc1e7e3ce',
                                   'a2a93bebd8c1456e5a29b98fc66efbb28a6b6a3bcb0589c2057fc3d779e07cea',
                                   '79d420102a7d6186ae19399f592b3ea1a10dddf4c04c42b14c30800865e252cb',
                                   '2b14e5d3a017e0926abe575cb38646be0eb15a0afcc0b43545c69becf8cf4077',
                                   'eab10325582e8de4becc52dca963efd13f1023e9a3eabf8b882e4145affa7978',
                                   '7d1e66f284f3e625b7e6e5bbd29da13532be70b32eb6f6a1b4b140c2f7845337',
                                   'd93fb6f0e11f09d586196ede29da6943e15920d8793e8aeabe924209f7ea1c90',
                                   'bb94376fffa2ea624b182908b3af68ba58438d9416270f6c7c6aa502fb4cc2fe',
                                   'd2a0e02d6374bd8872e4aa014b45702a8257b7818026e13893bc050163137579',
                                   'a251d39d624ef0e7fcf34df7a330499d8c925f09bb3c08cf254d0cc7e3584c8b',
                                   '434b4bf9b41718524f2db14d39c7de9a68a12d1362aff8100d086f691e1788cf',
                                   '0ae34f6bce6e8fdb9bbf906bee7c66a1201e86449509c0877f2f81a55f279111',
                                   'b597a4720745dd684264924311becb5d06e646674631d41923f318a561cf8b26',
                                   'fb50b63e152e34b4d47e1530551f6aceda82d91c7c307eb3fea559961ce98f47',
                                   '6bad736c8622f135fac1c90b66fbbd6b44b5f236b12f7b56a86b2fe458bd20c8',
                                   'f9f728deeceab6eb4215ad0164d5ecbd1c4321c69b6011ce60394a282290c6b1',
                                   '5a1f54d6989212b386ffc689eef0a354153ff42b25cd417b98f3d7ec949e893d',
                                   'dc1ab5d43826b3ba2b17bbcfe93e3e36a3c54ae9e033b6386b52b77d80c9d715',
                                   'b34731b55a2b654865f6e92968ffa84258219725b788d48f0ef8039c7c3d2dc3',
                                   'ad02ed9d53148638152630dad516864791b8b9f39b706c55ff1a412011bb322e',
                                   '2e3fc6d8c91b3e6116d08842a4ca953e7682a8210d0fc95e685932afd903d459',
                                   '81f452552cc305a290767f1791b85cc9854c4bc6524c9c1992e0ace45316ab72',
                                   '5ec4c63b9445b218cdf9a2f435786b5aac4070e85ceff079a64b51dc8b29a3c6',
                                   'cc1afd68f1902cad1898ec4369e92eb0e5a30f09906bc1a0f89c57182dcfbc3a',
                                   'c3892a1fd442f3d495a346ef2dfc865bfc1b2490fa9c484a47859d6bb062f9ca',
                                   '0b3865ae8a2e2c80a9dc777c4a10e6c622cae8055270d2135b89829d00e80919',
                                   'efbddecc23cd195faff27093c0ae5604bff585866ccdd2316f36625055bb358a',
                                   'becd2271e86d7f00c8fbbe0b69a3f3b487b83a0f80ad2251d5dabd9c0eab8254',
                                   'e19be155bf9a940827490bceb69f5a04891fe866a6520917cc80c9a60029b343',
                                   '8f06ef05146e57b90c0331fede24788aba1a9c950d1206eef3cd1473c574486e',
                                   '13320066a0c237f642df902fa42f19837a4ab8f5cf924cdf91318145e675252c',
                                   'a62f087de3ce8a5259fdcfd0c9b5ddbb75297ee9af9fa939e4128de45bc05628',
                                   '84fadf6dfcae0f67df1ed4fd51ba826278f61816d213e608057e27031f66a49c',
                                   '3fd4ab820241c8ea60652607756d14097949353288824735c9b1cde0a54298a5',
                                   '5a088e621548211721ce2299970536be748210bb4c6d88b233ab08c92e883973',
                                   '68db0bcd51a99a085d854f8e0861842b0a2dc99f4e8960e36172287678cc8507',
                                   'fb2833c040d50ce1f7267501d3916e56a89e8f4429e3bfb0347abfc574b21fd9',
                                   '0e4e00c2209436f9376866089b5866276d251891c8e66a0e3b3999625e10f277',
                                   '02775a285a12b00bb5b5d2f59d23fa3be4f0be8654b2614d5142a2c04ab773d1',
                                   '6cd02339302c5f009d6eeb6dd619678442cbe47e1c9589f6d9cbca22257af430',
                                   'c9e43fd7131c719ae652f6b46ac60cef5d826820dd96742757a9307651440a6d',
                                   '6aae6bc187dccd272382af3a948fff5d43e9865bd26b519a14ef48a99e5eff94',
                                   'c08046544b3998d46e59562a3241006399a532dbc53a12142080fbbfa19e8692',
                                   'fb47ef3acab3a6f7d5a5cbe7d9c83540a1e994a812e251ac7f649373c55dbad8',
                                   '7e52b6fdb839d1a82045076ac4f9659f59948b7328d415f8f26059382cf48449',
                                   '7cc6ffb7569d558dba16012e6873fe9b20f74707dbc5b15f2f0131e8d6373f4a',
                                   '267387139f1a01456bdc94be7b5b6ba91394a4c3cd6ac54dbb578c852de0235c',
                                   '75288ca15f1710932b1306b1b0f5fb1b6d04e672275e97809bafd7e79a8362d8',
                                   '535517962f24cc71cbc9dbbc9d1aa06100ae291e4bdee4803589fa8364dd9a6b',
                                   '29194378918a9caec034dc9e8a08e47717a0c7bd121888fb0500855492ee2797',
                                   '3cd137372145099981aa3751676bf18846f407a3a0787650276588ebe3214ce0',
                                   '4e226ff3a69090e296677f8c64bbaebed2d702e3f5b75c61f9aaa7309f05658e',
                                   '9183cda599913a0260649e44a34e2383ece0be790a3b9a771f3a24ab0102161e',
                                   '3c782fee937ae74506e46e63403903ff4355d202939e81ea65cc20d878daa971',
                                   '67a18f98dcdd9fb784ec2a8df7727b55a2286a99929ea894fc353e2c71e48314',
                                   '1b2b17f0a7aff338a93ad382577141137ef71baf023d22c96ef20beed652cf54',
                                   'ad2aea07eb09d82ae47fa70490db24fad7435c4f0b69496a28f6063b2e26b6a8',
                                   '16f5f8bd6da6857e5f359b3c174dc72db8e77d8575e0eb157d2ac271ef1e9821',
                                   'b519ececeaad1ee4c6fa78403ec868aa50e9f20805b284b398f007b5dc1049c9',
                                   'f8f74e7b33a13b02ba23b3fcab8179dd67eba3166608f7405c7b12d054c78192',
                                   '12e612ce93fde1db1947271a125a6773d7ac04ac245ae23b1affd4b910cb74bd',
                                   '42ecae126afd9c2948fd551ea312f2cb6fddc881c9d0ec2b17130d28ae875228',
                                   '3f633b823e69cb91cfbf47d43476d64f3e096ae1a996402ee6751adc548f292b',
                                   'bedd3667d6ab1efd779131adcb76c15e86700840f2c4a83f2492408b439c9308',
                                   '623648bea74302ef845b36256c4d13953519ab1af45526dbbadcd349d4611c11',
                                   '3bd775d24959f02d2e6a0c470e2ec9ba3357d24f88561879f878ff584ff7c1c2',
                                   '2c75852e5ad30cd15537053f17f2ae322946bb1a1d5f8fe8ebe76818bdb3da8b',
                                   '14e36dcf69f8a5e40c6a1a9d6ab52ff4cc045ea0fd882d0cafed0920ec86cb27',
                                   '7b09fe443c359b8c131e3c06383ab653b382bc391a0d5d32b699a063c7770099',
                                   '17c4de3f47deeb22b80bf2206498a6c75d2de0138ddcb7c09f4342f19d1531ef',
                                   '1ecde2a0c128dad23f4fa07f0166a071332bdafab6f0f661bc2a64250e25ece7',
                                   '62ae8990774799ed9987e5fd4ae0035869f944081c054b056e463a2fe0e73814',
                                   '9d45d55a88a1264ac51f393a65d39c9a00af7329263afed31eb49a30af778a04',
                                   '244b5871ec52025fa67240b9dec6483c6126b14249f1c45aaa218f910cb3cb7d',
                                   '0952f00c3de798fe7d0e804ffd7b9caa97cc563063796d7585d15ead47cfcaa8',
                                   '7380c049445652108f430e9bb2fcbb735012bccbeefa96917d63d90ee2a22cb3',
                                   '6b6ecd3246a6a3de013bc0a51a8d76e661e3afa71979cc6959ddf7270f5b601e',
                                   '8838e822f1e15b7c967d8ba51ea6ed43a8d736a1acdeefea8a1232755143883b',
                                   '4cc829c59e304b574ba57ce9d8f46fbe1e14cde8fa2fd039e448f5d60038e438',
                                   '5b325deff3b6aa7424e1d553f40906f7480bf0e388aee94a547b32b59717a50a',
                                   '5fa0f11fb9931acc395418aae5922024c87cacd7568b5f2d5278fa6797c5e89a',
                                   'dae2e6573eb6ed41f5321994b328e5be3d18d6ec54f1041133617f059a68fa41',
                                   '9a18d8e18eff797689af266c9131d3c2ae762693b5357ac4bd7c34b8d09ab48d',
                                   '615f6984dfdfac4a5628b1e2eb66d2f681b49e40fe60fd0ab8cc127b7f7b70ba',
                                   'da0b3ef0cc7f15e712babe2b6a88fea570fc58f0ba169eef1e85e694337d508b',
                                   '6e208881e1b72bf9b608ee8142c45ac896bea77fc0ab568a61ee83ce66a63267',
                                   '46af75150d16b50f9cd721d0e5e66284c3493ba7ceef44a801efa92ca425a493',
                                   '024601855d6da0c3cae47d21b36493094bb19be165234f0c697fcb48dca16898',
                                   '4122ddb4f76cda70c3ac47b164e6ceedd8fe6fce04b2f0e184bbbcba555af2f4',
                                   'f1c8d4a274220996dcaf69ed7c512d647cdf71ef338c9d52cae4ef12e1479015',
                                   'fdfdc535c1f5fc9c2a0329d20655fb07849b7bd20456f96dc7826c82859bfcd4',
                                   'a661471dfa65dcf3034418b47f73a9292f5ce43de83f74c2370dfcfde8341823',
                                   'f76e091531f3501a8591aa87767dcf6e724dd91bf8b32170e962bf9e69c23150',
                                   'aa4cfcba5c960cfb56ebb9205b03c06585ff7096129692466e3100b76d3ab98f',
                                   '3ac80dfdc06825905bcb023313492d700fb30ac38867912d9b28aaf14e0e1e22',
                                   '151c4a59694ab3a9579d71d122b41981572dee8863ea746a23f6d008833a4969',
                                   '6325709bc009882acd15a708f98e139175841276840319cc5af3dfbec280f7e1',
                                   '78c534c23e68c40b0cb423ad6548aac2ad2255cdc7c8d7c23fdff349e106bf4b',
                                   '066108ef1154136e766c267414fe7ece1b6f5f2502a81183ecb2a994f52f57a6',
                                   'f3c768f727e790fe21e35bfd6890db9dcbc4fffd5dc7b3d2b6e9f267192212fa',
                                   '801894bf5f46d8db7bffba8a95861bc416128255ac1dd3ef373c40f7aababf35',
                                   '72beae09c6901496be1cfcfdbe52840dca5f228b3140c7e5ffc257d215344f63',
                                   '5f02ec5641f7b456e0922df9c70d8a633ea79e765d89a419e780c43adf06171d',
                                   '2c690ae8a4c050746229fa3a4309e8089506313d645e714cd1674281e66439cb',
                                   '4348a1f6e34f552ae252035117ad2b4cda2020cb9a1bcca4868604d502898118',
                                   'aa09b8ff956819996ba05954a2ab421e1dde91f4c0b28d5699751d3f9e11055f',
                                   'eeb7549a0926768cf2643bb4bb6610823ca121329b0981b4ec3d839cffed93f4',
                                   'e27da3e9cb2a44429bc85872d6d712709785024050954405b2935719f69b0236',
                                   'd3d69321dd43d7154447b00c123b61fe8975d9c715580528a06f7ee8d4fe914f',
                                   '9e724be29b288b5312e99fd85292836ace990acbc6bd5d554bc586af6825a58d',
                                   '8790f59c3c38f865b5e5c7ca152b8c9bd789ece5bd0367fdcf0d930e647c4cd6',
                                   '8369d1be61c049fdc2ec3f8d5654999fc4c1866b8339671b995edd80f6224fcf',
                                   '84ebd811ecd57cceb1e399893509197ca6ce72c679080fd2d401a9fc75f936aa',
                                   '0b3ded48f11ecadb6e13659a4a3d9aab0ee8080418a2d778a912121e090bc6b6',
                                   '1b0f1d5d695ba49aa52998d58fef5e56dfc6b3975defeba5f61798dad36d3bed',
                                   '409ec57aab7f8184cbd0f184d6daabb2597fe1f2a320ce031a46f45db6045b8e',
                                   'dd7125fd39dd5531805ffc6e31e989aa2d2b3f5424feba56440d525162d658af',
                                   'fc38201543a2d86cf5da29a7536fd2d350cc2fd9b3e1b8131fcc58488e86432f',
                                   'e720e1f391e3f3eb32b32fd95ee42c6354ee9e4af2fd4d42c0e5d8b81794f512',
                                   '5a0082720219bc515399fb41bd56fa88475da4cd8d0e5b378430c080e582b4a7',
                                   '02da24e3d03b0285e6c3a831695b791a755514121308abad875c9c4f2ac38d26',
                                   'bd2cd201cf117c47ee9d855b6a06474fa3ffbc0754d3d2fed23a6fac9f7ffdae',
                                   '8971b803e08040d3598d174913016f6338fe47e4e2ccc296dddfbc7dd5db0ff2',
                                   'd66dc93958a6319c6ed4fc311d74ec9646c39a9257663ac75e60ebb1c80a816a',
                                   'a961ad1e4f2f3593bb23838549c7a62bebbb6f2f78baa2114ccbf84648a37ee4',
                                   '98ba55166825094e875b3b94d81d500fd78411e6d7fdb69761bddff649feae02',
                                   '39438a190cf7e28377f218ab3a3e68744d07d0c4d5d87a0c8a5ae69ee4a09db0',
                                   '1e379c39fff11f1b8b3608f054cd277f475b42e9c1b714097acbdf68a6d98c2e',
                                   'b7e00208e9e220a92ff6bd19da37ffa412d5d20e9c34eabbf424396c928b4da1',
                                   'f82df211d9e50e3fcc431694083b7f0918f66cdb9ca2f26233782676e90836c2',
                                   '01307f044a86103dc4769e886f0cd17ad2ad355f19be45f5107e65e3cb891a73',
                                   '617a9aaf25474e50da73cedecbe70cdcf65f321e40b93fee7d56347c23232269',
                                   'ed9b2d8bca115901239df6821f43943c98a34621981d260c674d08e465ba20c7',
                                   '269bd510de719b7432652c29c4b7792d002bf4b7bc78df155264b7b7baf59689',
                                   'e6579ff16f8c44a0af6f5c96b2e63f7338f5ff3bc5a68d38defae94713bba8bf',
                                   'e368dc10448d6f9df49b8f444903448e3b8210afe0e8e522c1439eac23baf673',
                                   '3c844d887c600596b6355fed6cde253f96ba86ea6255f59314b6c1cb5dc22996',
                                   '843b8b8a415a2aeac3a0a995f82a9a176f8522809ea88c9a793c559818889325',
                                   '712145d40582f985190885741bf8f27af7d714f9f35357a30aa84018cc4f1f0e',
                                   '0379da8860c6c0e44e73c18b4d4e8308ed80bf84fa554694d31176b19d3b4579',
                                   '1d793191661a40c034d3e107ee2464947aeb5bb673d6d7a0925b4642a11e713c',
                                   '300ac53604d4551b05bd7fe0de55504002416f3875d4ccef967e6a9a3278741b',
                                   '76f8896129f2c8f976af7bc8fbb5aad5dcfbe8105fcd5f45df7be0bf6281fa89',
                                   '0ae6da695066b2b55d64c19a4500942340740a47ba02dfd5a96e79b1e88594ed',
                                   '049ef1bc54f631b1155d9d6cbdb10e55fcc15036179fc3677b223b0a2eb31e81',
                                   '144924e099837b27e924d96410dc00cf81d75d182c93b124e2c2b6b60ba51dee',
                                   '4dfd9ffda0cbbb813f76de9b8be2955d33b951bd8ecbb5b4eea7000cff0633e3',
                                   '2e9a0836a997df71e5452198b1b6aa3327646770dff19f969ce65fdab9f56cff',
                                   'afe47ff32762fc798b1e63635c7002ee40cd744f37384b0639381c6e8ab0cd7e',
                                   '6a17e672785d423a0327666b92c1ef9e6d29845fc63955a5afc2ff3ed40b85a0',
                                   'a6223262e73fea70a81432c5d870a18134d85a3a030f1b4a2ef57dcc1480b007']},
 'thi-ap18': {'raw_sha256': '5b579d6567f36d1952254b33295b826720f1f9bd4163e1a4be63830857af9dbc',
              'body_sha256': '94f22111fea0ea29c56ac00950a50b975001757e31d45d179523a45feb3f9b90',
              'notes_sha256': '927e03d408453ed06bcba44cc8f673bc981a500af512eb53b57548f0879866b5',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '30da05306d87e9d353e750af13e030b9ac064e45ddc98abccf906c65ddb72723',
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
                        75,
                        76,
                        77,
                        78,
                        79,
                        80,
                        81,
                        82],
              'labels': [('1', '416'),
                         ('2', '417'),
                         ('3', '418'),
                         ('4', '419'),
                         ('5', '420'),
                         ('6', '421'),
                         ('7', '422'),
                         ('8', '423'),
                         ('9', '424'),
                         ('10', '425'),
                         ('11', '426'),
                         ('12', '427'),
                         ('13', '428'),
                         ('14', '429'),
                         ('15', '430'),
                         ('16', '431'),
                         ('17', '432'),
                         ('18', '433'),
                         ('19', '434'),
                         ('20', '435'),
                         ('21', '436'),
                         ('22', '437'),
                         ('23', '438'),
                         ('24', '439'),
                         ('25', '440'),
                         ('26', '441'),
                         ('27', '442'),
                         ('28', '443'),
                         ('29', '444'),
                         ('30-31', '445-446'),
                         ('32', '447'),
                         ('33', '448'),
                         ('34', '449'),
                         ('35', '450'),
                         ('36', '451'),
                         ('37', '452'),
                         ('38', '453'),
                         ('39', '454'),
                         ('40', '455'),
                         ('41', '456'),
                         ('42', '457'),
                         ('43', '458'),
                         ('44', '459'),
                         ('45', '460'),
                         ('46', '461'),
                         ('47', '462'),
                         ('48', '463'),
                         ('49', '464'),
                         ('50', '465'),
                         ('51', '466'),
                         ('52', '467'),
                         ('53', '468'),
                         ('54', '469'),
                         ('55', '470'),
                         ('56', '471'),
                         ('57', '472'),
                         ('58', '473'),
                         ('59', '474'),
                         ('60', '475'),
                         ('61', '476'),
                         ('62', '477'),
                         ('63', '478'),
                         ('64', '479'),
                         ('65', '480'),
                         ('66', '481'),
                         ('67', '482'),
                         ('68', '483'),
                         ('69', '484'),
                         ('70-71', '485'),
                         ('72', '486'),
                         ('73', '487'),
                         ('74', '488'),
                         ('75', '489'),
                         ('76', '490'),
                         ('77', '491'),
                         ('78', '492'),
                         ('79', '493'),
                         ('80', '494'),
                         ('81', '495'),
                         ('82', '496'),
                         ('83', '497'),
                         ('84', '498'),
                         ('85', '499'),
                         ('86', '500'),
                         ('87', '501'),
                         ('88', '502'),
                         ('89', '503'),
                         ('90', '504'),
                         ('91', '505'),
                         ('92', '506'),
                         ('93', '507'),
                         ('94', '508'),
                         ('95', '509'),
                         ('96', '510')],
              'paragraph_hashes': ['93551f95131c3278a8af574f54325c2db8f5815fcfeb0c545ff464cc1271a155',
                                   '51bbab514439452bdc78197e8f69f82fb30c63ef51b6793bf4dfeaa68d22f1cc',
                                   'a39b79ef2cee3378e3c0e0579f2fef717e738a85e2fdefd09b7dd544d708b83c',
                                   'a839b3704b37170a30f2bc8ffaa45c10e14979e9461b1833223dd7cea2a793ea',
                                   '9ba11e2490bee72f91adb70d4cabf342dfe117f7065ca0b253ce2565bf222924',
                                   'd865667aa6c84039fb332785b700155e05c71aedb7718481e2c89ee68601cece',
                                   '30e9ea8620e85ab4c1dcc022def80d0bcc0768d6e2133b8d48e97b0136ec0cb7',
                                   '52cf93365c1f35414d344bde9f988748f247e5bb4873c12b225edd1603f22131',
                                   'ab337a13d3910f0ced8b0a2e21f8a97c4ab2c196b76cdc434ec0c79222bc14e0',
                                   '362691242a268ca2a132f85d38ab66e72a7445bd964eb25e2f35def24b902c11',
                                   'd3c1cab0e0dbc1d86ddf10db1d3510f41408856a69422f1f97cd05c22b4fabee',
                                   '1250a8c0b84ff5acb9e4c28df19e9f61c216c8c50d8f3b92d49631c61fe06f20',
                                   '14396f3fe5f7f84c89bfbc00cbc8afc03ac80bf3d951ddaf9f07a6d58a407d1c',
                                   'db8735ba373c33847424569e6cd2911da74a8baa6da9a5db7890a2766cbae1d0',
                                   '2218d7a0cab0cb3f5011694de70c79809575df31d848aabd2277a64a3adfab0a',
                                   'b9b8bd846fa61c551fa7f2df6582591ed6178f207a0f80ecad41e93097e85e06',
                                   'd7bec3e8bba826dd2613131aff1593e3170b62cf672d2691c9aad6367cff54d6',
                                   '54b2c4822bc6f098c87dd351b3fbbda8692e6e837c28087a9b2f7f74bd0a1b2b',
                                   '448bdbed4eace0ab7af1cf3df71eefb0d955b2d9c92af2d4fa7af91036bec30c',
                                   '10f36d1505890e5225fc4fd3c605fd2e394ef269a9a9cb4608b69943480b5100',
                                   'aa338500df64fa5a0862c5743e2df724594103fcd65b78d5041f579cb85e9116',
                                   '04cfa089d83f2fd9c488642ecaf51d4f1fd2a2803073ebe444e585a23dfd4eba',
                                   '9ae6b411212a5329800b1b4456df988364b4d330c01b0291877832076540a8b9',
                                   '3ab8bb6ec94e9300a1ad31b3af34cd2125f2645cda816f8d7b549ac423f09284',
                                   'd3b508ca2b2acd9e6ab90f4091e4b4b58b25a855b90dbf7bba8511b905165755',
                                   '4ad8e360bfdd3ecc5967321c282c346e2d86e1413be24dedce7611c351e75e91',
                                   'c1a7946e5f33111a42fe6a1bfcaf7af6c8a7dece18c7a7dc2c8dc346e6a52fd5',
                                   'fc4c4235477415ead571f567adaebbbffdbe53ef1b05220e36cb52005fd4e139',
                                   'b4e8657b5ec9d83ad373e9c431c1fa064ab5381017fd72b983c005f79db600ef',
                                   'cd948d4ac73d7c61f00c82ae0abf8ab1545583c317bd3caf8bd4b4c63272b0c2',
                                   'b2254da00d6c9b6a859008e587cf41533477f4f8dfef802d4018a11c7693c479',
                                   '866279f3bc32296d859b1e94ca3da134aaecb55a1044f1e3d6372d40a319ac30',
                                   '6fe7bb7137e555163fe231c2b8469596c4ea855c3342c42c4e2a4bf0325ac701',
                                   'f2ea1609de1f93e4521e09e6c1df5ffd1363688f1010602e40537e75f17a21e3',
                                   '13071e2f087d8313e2fcb889dac96f3e282750c15649766eea5b530d3a0ef8ea',
                                   '75a0cabbc54f9ee833db5d2dd767d8e4a68843d20ca2f5bfad7ccdba7683ae7b',
                                   'f2c86e9d78611f81ee903404ef2318c3c784662828f1539222edb5ee6003949b',
                                   'fcfc120b993cc07fd44840b71b5a4487d9a89f795ded99129b681436398df0cd',
                                   'd0b8e07fce74ab84ef332606e552f00a87d9b10de1238f15e10645ab44051fac',
                                   'b59ccda26c8fc28980f8f5c84fe0e444a81d43c2f333f8ecd3a24aff50a4d7ea',
                                   'ced5b8192a12fbf4af7430c04988e2bd55c279868cf5e48ffa70fdec095fe2d6',
                                   '4d8a4f1fc1aa41e5e58e578228a4c358aa29f128b3c8a20d035bc23e68f836cc',
                                   'efe59ba3b25277df4a321786df76fab37a2e49f9f959ade6975d2b2000be9d26',
                                   '006a1eacc2f13c0d2ce241c66cabb1a0cc68463f9f75ca8899d7c7813e4849fa',
                                   '36777ce3ae8a762fbecdf858fd87bebd02c376a8166a62fc27ef327a60c4da55',
                                   '895cca4a460628914663905c437b3a9466edc938f6c533ead4f6de1d2c3ad6d4',
                                   '515449adea23d57add02639899937232e7342375adec69b01035021bf4eb84dc',
                                   '139a97b3705186da5d7501286bf24dc07e94d6ef652d6cd4d526b42034f55840',
                                   'fe846a1a96abad689ba650d5130cfebab9a73521cbc47eec2fde44414f5cd0c1',
                                   '39604ea2ca1f668fa1645491c6ac675c617c104336f55522d6048d8ccbc83265',
                                   '7a510b3b8c3148db4e57ef8d01fe0f0ebd5f212514547177a49086fa9907936d',
                                   'e11dfd08797fd90f71c5644d1a5649980fbc4b24775a648a5e3365004427618f',
                                   '7ae46fe4ad696656cbfb0a90d1692fce6e8946e71f763dd0a9f25f0ed7ff1c87',
                                   'a9d8e72ce900c69874f66605501451c9cc844b55c91e90a0ca6e14655d713dd1',
                                   'c66d7b5a94f35e701ef3a6acce735c691e1bdc9519548d2ba305988e82889148',
                                   '6364848352025fc8294576a7c2d8fd108c3c0b0099ccd61aa6f02fcf12bc4bed',
                                   '4c0fbabff12270db8313023eca784d98c0bc0a6fefc9a08cbd2ba203958564f1',
                                   '9f93f0dcd4435b98d14c090c5c491a38a1ec06a31378faa24fb599ffaadfc20f',
                                   '2459c795150a98d800c5034da8620683d8472ca076c227a9e9d63e6b0f97c5a1',
                                   '0c81846a553496024fbdb0f5b00615701ebbbea069d958ddbecaa69ad034af79',
                                   '3f742d77ecbbe0bc8cf5899c0b9b16e931b0ce995fea2644eee2c844bc67239b',
                                   'e77c5052ea25e896f44c900133ab204440560c465c257ae8faf3e69d939addd4',
                                   '802b92169e4ca5f800fadbf9795cdf6cb3516876f868c0b244c20d0983ce9653',
                                   '93b919c3441ff0aad4bbefdf254c484c6f048e14b4a4b4e04bd3a6cbc9f87608',
                                   '98cbd86c34870502fe7c74fccdbf15e735cc657e1e9850376564fc5dc57c04e7',
                                   'dc5e3ecc87beda94a9622f1604d8bea4716acdc954260bf9a7287edea6481582',
                                   'b60b7c0fa7e27546851947a0bb5e3d284f30937a3c6213d29aa1552f7d16fa96',
                                   '3895ac102cf155d50362158987f2795e92ca3acc1b99245e030ddc868bf956a2',
                                   '13747776703654abd9afa68d62d024d1d75166fbc3286bb752510c384187f7ca',
                                   '7f5b13d60fa9f25cb03a510adcbb728cf4a2e83d8b22beb472ef32abb5fa3c43',
                                   'a8762e7c12dfd0a492f0e0d11245f4d1fc7663eaf245b7e0096a5b1b1cea90ce',
                                   '02e0c1a4d513ded8dc6e1fd55c0dd67a31bf80d2a37ac64b3a1c8210ae483c51',
                                   'fc37297883316c623fd6458d922b977fbb1cfa68007b4ef859e76eb8427a76a2',
                                   'd684a88606c6a3ac3b2c043ab0438c94ad913c2e98d3101d8e72a1c77b116155',
                                   '8d998b5e52b0b738a0a6762969b8dae62dfcab7b17b8e3a790d1a1479ca80653',
                                   '450d4fe85be341bd5e1e676ab5a565669e844e147c15b4abb518b5d909f31baf',
                                   '5a24c99584eac83e62ee10c7f45b8108c8001482af44befac4835d0a6f5c802d',
                                   'a0ff53c3b58bfbdb8f2e7a0e3726930007722ffef50e79d268cc2e0957255155',
                                   'ff0a5949e5db0f032838f56fcd0b21c1fa545a0ede4d0891c84c362e261d95ff',
                                   'c4b26ac23f1f53f0ed4731d55f3ecdee0d7986e650646ef693e06b1653b071c6',
                                   'bed54448c63fc10cb8da75c2f5065612fc8dd7a27c2b418eaf5fd460c7497b39',
                                   '372281bec32f5703c6433f50252421e461fc117566ce4cafa0c19084b325d70c',
                                   '9b6b3f8aede8ac903126210cac4d488e2091bbf39bd167601d2c5000a1c97175',
                                   '948049ae6009425069e93fc13700858c1973cc6922f316a4b7267dc3ee79ccba',
                                   'f66f01c4786b29a65736a8b7eff55e9ae08a1c8deaf417b058cff465e35d879b',
                                   'b84b55d6435b6330bb68683f11323f3cdd195464a3b1b0b2a8d93b467872ce9e',
                                   '537fc003a4db245c186cc64c8a67277233b0d049e7e60f3e785d1677a105c072',
                                   '4c4ce703863fbee9d023ac77c2d8842695afb90817200dcfba8b17c955b20537',
                                   '8975389fcca0f44cddafddc9b923abd8ac245401ac1e5323521ac501a90a3d4d',
                                   '0c6d325337bbfccd63d1e5f62b4fec21c249b2b867a6db179629ac95e7306d9e',
                                   '7a976830dbc2d578fb40f208b0c6c10489c449bf47a1f382ef6e2d612858c78e',
                                   '58cf998f2633a1f6cf48fdf463e7fd30bde5ac250412111c1e260ce78697ebe0',
                                   '7924a36aae09b5d99633bfbb7cc95ed90e3341370df77761271d3aec9c619185',
                                   '4bd0dd824dea7899ef34cb054c54773edb4d8545030bde7ab2068daa0aed5b87',
                                   '1c3fdf34a22b69081b6062a3e80d74464eb5fd06ab9f1f012fabfc1c1d620a85',
                                   '300a2824158f44b5b957dc25a798a08a98ae1a112b82bd60bb4375d4803a9ff8',
                                   'c937443103118802e4ea8a368c0b538f350504822edcd194a1c5f831d351538e']},
 'thi-ap19': {'raw_sha256': '6ca863b88c543d78aaea3092404f6ae1d9953fc3dbd4c993e73dc6d2dfe8f8c5',
              'body_sha256': 'fee71ea5b44344b88f90925ef4ddc8fc112350e4789d7092b24f1cda579cbe28',
              'notes_sha256': 'a7ee7a8f75320989c2f5fb785b05e8cb4ece96343722317f424371809da33796',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': 'e9efc0259984d179c7dcb3cf69232a759235125224ef1f1a83ba88844c153a5e',
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
                        75,
                        76,
                        77,
                        78,
                        79,
                        80,
                        81,
                        82,
                        83,
                        84,
                        85],
              'labels': [('1', '511'),
                         ('2', '512'),
                         ('3', '513'),
                         ('4', '514'),
                         ('5', '515'),
                         ('6', '516'),
                         ('7', '517'),
                         ('8', '518'),
                         ('9', '519'),
                         ('10', '520'),
                         ('11', '521'),
                         ('12', '522'),
                         ('13', '523'),
                         ('14', '524'),
                         ('15', '525'),
                         ('16', '526'),
                         ('17', '527'),
                         ('18', '528'),
                         ('19', '529'),
                         ('20', '530'),
                         ('21', '531'),
                         ('22', '532'),
                         ('23', '533'),
                         (None, '534'),
                         ('24', '535'),
                         ('25', '536'),
                         ('26-27', '537-538'),
                         ('28', '539'),
                         ('29', '540'),
                         ('30', '541'),
                         ('31-32', '542-543'),
                         ('33', '544'),
                         ('34', '545'),
                         ('35', '546'),
                         ('36', '547'),
                         ('37', '548'),
                         ('38', '549'),
                         ('39', '550'),
                         ('40', '551'),
                         ('41', '552'),
                         ('42', '553'),
                         ('43', '554'),
                         ('44', '555'),
                         ('45', '556'),
                         ('46', '557'),
                         ('47', '558'),
                         ('48-49', '559-560'),
                         ('50', '561'),
                         ('51', '562'),
                         ('52', '563'),
                         ('53', '564'),
                         ('54', '565'),
                         ('55', '566'),
                         ('56', '567'),
                         ('57', '568'),
                         ('58', '569'),
                         ('59', '570'),
                         ('60', '571'),
                         ('61-62', '572-573'),
                         ('63', '574'),
                         ('64', '575'),
                         ('65-66', '576-577'),
                         ('67', '578'),
                         ('68', '579'),
                         ('69', '580'),
                         ('70', '581'),
                         ('71', '582'),
                         ('72', '583'),
                         ('73', '584'),
                         ('74', '585'),
                         ('75', '586'),
                         ('76', '587'),
                         ('77', '588'),
                         ('78', '589'),
                         ('79', '590'),
                         ('80', '591'),
                         ('81', '592'),
                         ('82', '593'),
                         ('83', '594')],
              'paragraph_hashes': ['afb663612b47aacf1e782868e44d3815c54a0285af4c453ae4a88ed29f23f9ef',
                                   '26e40efad631b73f7554e0f7e7513efc44b1b5db114eaa9d80a9670d381b7a9f',
                                   '45b7193c5311729ba1b0870d291cf680ccd3c4b6e72427d73d2937f256bc3725',
                                   '11887ec0bb52c4a9534912ce741b6b0315bfe5f5d8654f8fb4dcf7566f1926bc',
                                   'cbb040f5f1df04915e04fa8c4778f10438cf44d54f955c952d2252dd787d6244',
                                   '3a50607cb06bb6ec9b1cce0fc7146ea0c3aeed101bd4936727e9d8fa6177da7b',
                                   '1f579616debf6a279933c27a31f1d7b018f3a518955e63497091752411d60fa3',
                                   'a9597783aa9a16223078bb32250048e4da982d86f85e1afe14b779d6a5f59f74',
                                   '67ef32abf331aaa2fe6affd938215ba7de279f5ed0620122f56967731721386c',
                                   '986c03fe35f0b356d2d0b890986f3781534f9f95be83b1b57b7e5c9733db3dc2',
                                   '53df2090b924e7f14d16c71d77bc1fca53c9c99ffe1d94e316c9dbb4ae336046',
                                   '6e86ff6dc31d0691f5a4a5750698a257fb6ae00742a5ad7846e93fff1c367d8e',
                                   '4b0593ee8b41d3661a21213ae9e835861605a782c9b8e8eeac1eeffcb31d4b13',
                                   '70b0553ee28376066c019ee57e3d4bf416b3c5625f973e37e19b6f40dcce4766',
                                   '85dcc1acd837aecb068af2a69b73541cb9afe3cea435f44f56b81cc833129fda',
                                   '07ec978685043e05c7fb90bc62ddc2fe08de1c35a0d6810029fb50d84194ae6a',
                                   '8525f68431cb3c74aa3884725781326158a1781c56ef817bfbd36ee44df543ed',
                                   'a01bba3c59beeb2cc67e8533fb75c6cde0c5d92f483d3a3ff4de10e83d07549e',
                                   '3ec7fb29adb421528fc860dc2e505ce26445e1ab9d655705d66fd12cc23c55a4',
                                   'a8048ae1dade9b717a5e5e3a1fcd3e0fff63809f26f11804471e95061146ab05',
                                   'ca1fc1a028d4558e12cf0b5b1464eceef1cbd428b0be48051d110edf895de0bf',
                                   '8e18b50cfd886eccd395a7d5330b79a96fa8d827f71bfc75205203a28314dd93',
                                   'fa26bfe82920054b4c1558b5308e4d8305c80119ea145ef22258f8994aabd1c3',
                                   '3d63b069eabbaeac82e00d5569d6d95da73b5f2bf967ccb546280fb6c66a96f6',
                                   '11aade53ab9b9f0bf74597f1fd2132770724c1e1561f30cada34cf17d5b65f99',
                                   '7c0a6854ab9f647466a91542dfb3e579253e96691a5e9fd60672abccf6c84c0e',
                                   '211e1dd6ce82563f5d098e55a95a7f85a65de46b0fae7d93022eaa427dd76d58',
                                   'bdbf8e5042cb52053ab3e8470b225263dad93a819a8a0ac2a5cea1e6ba4a319d',
                                   'e5152e9b14bf02efb0fb205849549939a9b66a93ea2065585efad81e15e2e463',
                                   '339eef3fbe4e2272ea64bb1440a2ca7add920852ce0307c59d2a0df816e20599',
                                   '159b0f4450ab32f2768f15661b0852ffe302103ce701a03bfac55c411e81b4b5',
                                   'a37314b857f9944b4172741345a986ddd10088170874dce9cd4a36c078627bfc',
                                   '671d2d2cd68ba6ba40b23dada908cf9a6fbfc8a30c5bdceabb8ef3c0a9e3c051',
                                   '5d9217a2ea57d67ede9ffcdf56986c4e44ca90e3b5afae919b129c431aed5f17',
                                   '4ff96fdf3c58697e6eabe5f567f4f84307644473e9d57815850ef8731761adf2',
                                   'f4148d5afaa480e423239792312502d401760a9715da18dbbee1cf7ffceab526',
                                   '4de216ee7a4e4dc812322e55ff56cfc9c9ec6fbb46afba26d2018e156647fb6a',
                                   'fc35f1a52c333e5814d67541017ae94314bd40d6990ae14729246cf1bd63304f',
                                   '5411e7706a59fc0232e53dd655df1780d30f50310791c50059594dc9eb1f80de',
                                   '42b5a0799d0f5d143c3f10502f0695cb4c5b854a36efeb3cfe64010dbe137f5b',
                                   '577e98fa2648d54ad7f5ddd5025798cf634e59466e91eccef7e4bce1286f3285',
                                   'f702647d193f4fc7059e14630a7dbf6bbff0360e52720e0d28c574f7135deddd',
                                   'e41b18d6c66265defe0c1e58c50c9e544c8f6d77e3e2028332f973678a3c8451',
                                   'b75b4b18ef8e2d85ae65a3aa7cbad306d6788c4fc6dd222cf72c9ed36a9427bf',
                                   'cac419c5db4528746268c3faf2996670b6a69cdb95cf245c0fb9b677dfe8692f',
                                   'ea3eea82a3f760d162cdd2636581cc8b06e69af090fee3a187ffaef0253d10b5',
                                   '12d322a51bba3aa9d96e8d34f92a724ae5ae5ddd0bdb7f3be695f345abaa2508',
                                   '1abe25ed9a57e759e5739fdf49a303e23d01a8b75c927ebb5713b80d997e5e5e',
                                   'fe47ab79140c3f271bb60ad9cdc2c2e70ab1ae5628a5e2805047803d676f5073',
                                   '45d40e850c625bd29368948c53e27b60a9d3a1fbd14058eb966a2c6479d07469',
                                   '1d05ab22d905a568a12307299aec328125edc6cc1ca4e67b320335a85e4eba4f',
                                   '9e6e4c047edc8a8074771f25cbcf510a4e1d5748ea9425631e19a32b023cd4ec',
                                   'e5a411c6a73dbea6f4ca15d789bac7c205615999078a12201a95f835c02641fd',
                                   '401a079aaa8b9cfa39fe527bf81811ed97687cbfc5dc41d8e2bcab8a9e23341b',
                                   'a8c9cae34ff91b20272248b08b497c4c2703bf76f8de1c3188a06f2e78671f9f',
                                   '7dbc66011d81f159297a86d1c71f631c10d12817f9eb13969ad2cdbaef7b9ecc',
                                   '2a527779466741aab933609b22dc5a8dd13eac9c14450eaf363335f7406539cb',
                                   '46a4e7a004a65fb4c809a7b42fa374c57151a61a95f03ea8b531e09505825d44',
                                   'a81ea6c9e03a975a3befd2a782d45f790a7db8e2bb593dc39debccf70c6bdd32',
                                   '68f65cdfee2e96a0d343560d575731325aab11353e6de44c6c1b3022778c2348',
                                   'bd269b12215eec73bc918976a79cf529568b7fb7666c141e77f689b7b4add67d',
                                   '4965cf9d8c758a0032c6d3cb38aeaab5c831c58c2053eaecf3bc5580b795c40d',
                                   '1460fbb71e905e4432bb3e2e31d83fa4244286aba9dc3af58d178f75dda256f4',
                                   'c0561b21c6fd5fc847e8f475742ce52fe218fd5085c0f98b7f1e610484fde1c4',
                                   '8c255c571b8b3ca2cc1989a1569cea16a5089b5f62c3ad647fb7ec1a2f8383ac',
                                   '42a660dc3d5c033b585fc8257fd1d79fc55b5982b047a88e65893bfe172763a1',
                                   'b8254afcf2dcdc11f34a58fa88205bf8faa30cc2b0ad2e40e58b20c817188f8b',
                                   '1ccd2f2d39bc16df5a3afdb7c8e4eae4438adc646a7ed008e8083cff10c62586',
                                   'b96a20a66f1eed122e447ce3241ac04cb06f7dc7146457b5e60111345ddf6536',
                                   '9306a13c974036eccf94ccca6983e2532594ebb83aca21cc247ca33ada4c66fb',
                                   '695409d06a57af7e2c8e6816316a637431a48a9274c8403f2c75d1fd102ed1e5',
                                   'e1e039b26d2894cee737bfe1c30bb594a1e5b0f5c565670dc7527ccf8602e709',
                                   'ac9e6e077cc925696c7dfae8eecccab2afe7da02f22cc14a6ed2b236ca208d7c',
                                   '9ba07eaba56b841bd2c699c9af52959e5963e880487b0978ad04f854245b8df3',
                                   '9db2690a862735472b1bf0fdc08aa29dbd729f5c573d7fce7930553c759fb62c',
                                   '7646019a48cdf56c635dd4f98f77e8d1060a8a7d0eddf07742099bcf9e16973c',
                                   'c6705de07dcd9691f3670ab68c2e41699d6ad35c956f6c3aa96a2da9c56ffe29',
                                   '60d5dfd604794db01084a60ab7a1ea77d9ecac370edef111b133f0b10d526f47',
                                   'e66886239ebde0e85fd3276d5a46d6d09419562de2099542676e448765dda07b',
                                   '0eb2bacc384d256a598a44876f3c99791f5f0fd814881f503bcb5c9d65cef4e2',
                                   '04e8fe6b8c3e6b7a8b0711a23c1894b116a1b195e2a37ccd3f45450396f44d4a',
                                   'd7bc11303498d0d23c826ee01746721f5f28a2db37572e6b433510f5417affff']},
 'thi-ap20': {'raw_sha256': '52e6c06170c5e7e23038d5e5d302c152476fa1bc5f4b287985b6b943bbd64d45',
              'body_sha256': '2222929d70fcd22ce76a37af71bc0e1a086afbee5226703602888b15a0bdfbb4',
              'notes_sha256': '0a516ec2cac11dc4e4e542429a0e7db44f7654011315b9e1a682040eca5888c4',
              'paratext_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'root_sha256': '0df732f6540bf82fe511ca848f8fb39ca6815a303d4f1e6a753b692704a785c7',
              'notes': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
              'labels': [('1', '595'),
                         ('2', '596'),
                         ('3', '597'),
                         ('4', '598'),
                         ('5', '599'),
                         ('6', '600'),
                         ('7', '601'),
                         ('8', '602'),
                         ('9', '603'),
                         ('10', '604'),
                         ('11', '605'),
                         ('12', '606'),
                         ('13', '607'),
                         ('14', '608'),
                         ('15', '609'),
                         ('16-17', '610-611'),
                         ('18', '612'),
                         ('19', '613'),
                         ('20', '614'),
                         ('21', '615'),
                         ('22', '616'),
                         ('23', '617'),
                         ('24', '618'),
                         ('25', '619'),
                         ('26', '620'),
                         ('27', '621'),
                         ('28', '622'),
                         ('29', '623'),
                         ('30', '624'),
                         ('31', '625'),
                         ('32', '626'),
                         ('33', '627'),
                         ('34', '628'),
                         ('35', '629'),
                         ('36', '630'),
                         ('37', '631'),
                         ('38', '632'),
                         ('39', '633'),
                         ('40', '634'),
                         ('41', '635'),
                         ('42', '636'),
                         ('43', '637'),
                         ('44', '638')],
              'paragraph_hashes': ['f3a8cde2e9bfb08fa2b2290cb679581550d1bb8f998097db588abba6d3d20c54',
                                   '09affc08258fd3f1da482c79687b7f1ff7d4d2bf81d9e4e996990878dbef9d23',
                                   '4cb18b19e681ae63aaea585b9e8a8d8a76f47c0f1d75163a541c9473795d2a91',
                                   '63dc87364f52a375dd47d0a22e68fabb97735ecfda8d9c37d2f01a26ea448389',
                                   '200ab11bebad3b4b5284ea4fc4b5b86dd871aad7076b8425f2b68ca9626a1f08',
                                   '18d1597ca11d824cb41c31c5d32756a33e690b97f60e20db152954f314c9b0de',
                                   '2ce08803ed88cc8618933201c3db71de8f638cec3a4fe61583ec56f95adc64d3',
                                   'acaac225aed0769d4ea591e8f34b0d0f07f09d3f6aa513649dcacc4e5d26c089',
                                   '11b938c22d2f611dbd84f2d7b088804ab6e3f0f99d5a4ea0873ffc8afe8bbe06',
                                   '6de5c9f1a5ab6dad4557f3d3282616f62a714f409b1c2438368afbe8033c7d2e',
                                   '9b66335246af14a891e40991b5bf5bb85c1d25f99fb8c579a2412afb952a65ce',
                                   'f781333365627920b0e6e9837dd37cd30cc02279de4c8424069a2d95de39a4a1',
                                   '073c5c7cb529fcec4c18d90e6bcb56ab16fc36c6c9de760a96e8d8d1c9f78077',
                                   'cc3a7c1560eba2e40df11b6ec360d3eb37664da545395c9123d1b220174bb59f',
                                   '3d4a31d2267bad2dc307f06e8cef307cb68570cecab6b47a9a623d462d05e46f',
                                   'b833ea204cf205603c611ad35fd92a9d752dfe06af2ed249e53861e822f84ef1',
                                   'b9459fa8d3f05f046351934e636b617290ed20d539acd9e6c10804b09365268d',
                                   'fc76f9084be36d0e7ff2ba9fac2e8d483d11c62a6137a8d3885b0ab25514de7a',
                                   'e2619e860494c256729e94fb67a7578ea87babb1622ff52b435fd9b4650e384e',
                                   '8b80baf8979653a0d5d672fe622c9a9ccf900fdacad2395310cd5b9ec1280141',
                                   'de4f8b1573c9414f08787f4221e81ef0a6fb7f5fa822ac688b55dca77157abaa',
                                   '4979dfb25725d33611412e952e204ce1bd05cb9775cab1cb43ff8b93eb38909f',
                                   'bfc2271af168a993be9c066769087589bdf6a1b71a69235f8ab3c86855ca243d',
                                   '319d890cf5d73bdef3c09fd9108278ad19e73261e8fc5cf6119e5f09e42985b3',
                                   '8b9a5bcee82be85280855e0d39a23cf53a239f716d17137509eba9e0bf49893e',
                                   '47cc4e2609d8b5567b75271e2e678e1b733b4806809bbd58677ef3b91514a981',
                                   'b4f5eb9c7e139f63c006dc7614788a95d9f7f1829ac0313f0a6371548f921a57',
                                   '1629a2359a6cbcab021c228202ec5928470b6deca5beb9c9cf2f7806f432b648',
                                   '1f4f5334742b94f9315efb2e1f587d08f12292ca12d8fe1847f099abb17d8745',
                                   '3627b1e5d2b1d42fbe2632a1175f840f9c7d6527517b8972a267203511d646d9',
                                   '1b6f517424e6966fd9e87cf76a5202a9553cf7b02a069c0c9fa88a83c856e9e8',
                                   'fbf2062263b731d032a7734f540a6f83ca6f275ce35dbb3011f1b7bbe4ad7631',
                                   '78cb10de02c79d9fede1368feedd42d01c4b4a6c0bd81c414baa62ece9c64801',
                                   '0bcb639d3cca0e674dbf334c64790f86c628e7dec7b2628689ee5801adbcf051',
                                   'a080f908c21bb774ac211187f6f5ddf436edc7bb460afc720eb60123ca226f49',
                                   'fb8bfa8b722c38ffea1af1a28d46c372596c90cf6e9117d5d013b12f8feac2b4',
                                   '12213e044bf0e66cb5501762efce653f66191c7699243d2888a17848317eb41e',
                                   'a96931327fe7e6672489bad77a4a2dc2de23571f949d7c88ee162200ade23ebd',
                                   '9a7f87d97c727fad1e75c56c52f1de7f240c513fd70016442889a51ec9861b72',
                                   'e0e35d44bbca583204940fd2fef956926f0dfe52206d4e4c6a190d97a30de083',
                                   'ae836a0f04790523573e66029854adbb31ca01a0658cbb9258a369bf43a85e22',
                                   '6312ed6901e82ca66e23463f233bad5db7d3ceded5e10bba5d48b35510766ebc',
                                   '0e1428b835386fe6fc857ed3beca069547609e96f05bf4e1b1d9560d9d9e23f8',
                                   '1f7ceefe3e90f4f1e2c5dbcdf258dec17a8c6ee5ce94cebce4fcdea52572f455',
                                   '7c0c6664b72c4176a3c265a0bf0642d2714c1619ba92b7b71650fdebce714571',
                                   '12040fe48e5e8d167e5a19eb269f063e5cbe08a147f836a9257ad48b01119666']}}
SUMMARY = {'kind': 'canonical_chapter_summary',
 'label': 'Second Therī Apadāna chapter summary',
 'parent_id': 'thi-ap20',
 'first_ref': 'thi-ap20/48',
 'last_ref': 'thi-ap20/51',
 'root_start': 8472,
 'root_end': 8478,
 'root_sha256': '3986f6f59952c43685b19cc37dc1d1977649e4b36cc5dd1521a2d56b6933ba7c',
 'body_sha256': '8701c0a6b7b5ea7736dd41f37afef0153653ee7efc8b9b33509ccb4eadacba64',
 'notes_sha256': 'b6f6fec2b446374d7577d5ef365af6a75474404e751b9004fd3041ec9eb988d2',
 'note_numbers': [27]}
DIVISIONS = [{'kind': 'publisher_recitation',
  'label': 'First recitation portion',
  'before_local_label': '22',
  'before_publisher_label': '248',
  'body_sha256': '98517aa34d401470f71d510fdd5aebada3597c029abd94579c1d5df6543c0539',
  'notes_sha256': 'f1234f877d75bb55da1f9861699a2df6d8325af2f4f87d9e268a41bfb239664f',
  'note_numbers': [21]}]

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
    # Keep historical assertions strict for the original twenty; the third-chapter harness owns 21–30.
    historical_ids = set(BASELINE) | set(NEW_IDS)
    for uid, expected in BASELINE.items():
        assert digest(compact(rows[uid], sort=True)) == expected, uid + ': previous metadata changed'
    for uid in NEW_IDS:
        for key in PINS:
            assert rows[uid][key] == EXPECTED[uid][key], uid + ': independent source receipt differs: ' + key
        assert rows[uid]['note_count'] == len(EXPECTED[uid]['notes'])
    assert rows['thi-ap20']['chapter_summary'] == SUMMARY
    assert rows['thi-ap17']['publisher_divisions'] == DIVISIONS
    assert all('chapter_summary' not in rows[uid] for uid in NEW_IDS if uid != 'thi-ap20')
    assert all('publisher_divisions' not in rows[uid] for uid in historical_ids if uid != 'thi-ap17')
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

    with TemporaryDirectory(prefix='pali-apadana-next-') as work:
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
            assert bool(data['publisher_paratext']) == (uid == 'thi-ap11')
            if uid == 'thi-ap20':
                summary = data['chapter_summary']
                assert set(summary) == set(SUMMARY) | {'text', 'translator_notes'}
                assert all(summary[key] == value for key, value in SUMMARY.items())
                assert digest(summary['text']) == SUMMARY['body_sha256']
                assert [note['number'] for note in summary['translator_notes']] == [27]
                assert digest(compact(summary['translator_notes'])) == SUMMARY['notes_sha256']
                assert '[Note 27]' not in data['text'] and '[Note 27]' in summary['text']
            else:
                assert 'chapter_summary' not in data
            if uid == 'thi-ap17':
                assert len(data['publisher_divisions']) == 1
                division = data['publisher_divisions'][0]
                assert set(division) == set(DIVISIONS[0]) | {'text', 'translator_notes'}
                assert all(division[key] == value for key, value in DIVISIONS[0].items())
                assert digest(division['text']) == DIVISIONS[0]['body_sha256']
                assert [note['number'] for note in division['translator_notes']] == [21]
                assert digest(compact(division['translator_notes'])) == DIVISIONS[0]['notes_sha256']
                assert '[Note 21]' not in data['text']
                assert division['text'] not in data['text']
            else:
                assert 'publisher_divisions' not in data

        def check_whole(data, uid):
            check_source(data, uid)
            assert digest(data['text']) == rows[uid]['body_sha256']
            paragraphs = data['text'].split('\n\n')
            assert [digest(p) for p in paragraphs] == EXPECTED[uid]['paragraph_hashes'], uid + ': paragraph wording/boundary drift'
            # Each independent label retains ranges, repeated/irregular numbers and missing global labels.
            for paragraph, (local, publisher) in zip(paragraphs[1:-2], EXPECTED[uid]['labels'], strict=True):
                label = ('[' + local + ']' if uid == 'thi-ap19' and local == '59' else '(' + local + ')') if local else ''
                label += ((' ' if label else '') + '[' + publisher + ']') if publisher else ''
                if uid == 'thi-ap18' and local == '70-71':
                    label += '.'
                assert re.sub(r'\[Note \d+\]', '', paragraph).strip().endswith(label), uid + ': label drift at ' + str((local, publisher))

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
                    assert digest(compact([{'ref': seg['ref'], 'text': seg['text']} for seg in meta['segments']])) == BASELINE_ROOT_SEGMENTS[uid], uid + ': previous Pāli segments changed'
                assert len(meta['english_available']) == 1
                choice = meta['english_available'][0]
                assert choice['translation_id'] == version(uid) and choice['translation_revision'] == commit
                assert choice['license'] == 'CC BY-NC-SA 4.0' and choice['url'] == rows[uid]['url']
                if uid in NEW_IDS:
                    assert choice.get('chapter_summary') == (SUMMARY if uid == 'thi-ap20' else None)
                    assert choice.get('publisher_divisions') == (DIVISIONS if uid == 'thi-ap17' else None)
                if uid in tuple('thi-ap' + str(n) for n in range(15, 21)):
                    assert meta['source']['locator_revision'] == manifest['vri_commit'] + '-apadana-theri11-20-v1'
            neighbor = tool('get_text', {'uid': 'thi-ap21', 'limit': 200})
            assert neighbor['source']['locator_revision'] == manifest['vri_commit'] + '-apadana-theri11-20-v1'
            # Source21's D244 Pāli locator remains stable after its separate reviewed English approval.
            assert len(neighbor['english_available']) == 1
            neighbor_choice = neighbor['english_available'][0]
            assert neighbor_choice['translation_id'] == version('thi-ap21')
            assert neighbor_choice['translation_revision'] == commit
            assert neighbor_choice['license'] == 'CC BY-NC-SA 4.0'
            assert neighbor_choice['url'] == rows['thi-ap21']['url']
            for uid in NEW_IDS:
                foreign = next(candidate for candidate in NEW_IDS if candidate != uid)
                for request in ({'uid': uid, 'translation': version(foreign)},
                                {'uid': uid, 'translation': version(uid), 'translation_revision': '0' * 40},
                                {'uid': uid, 'translation': version(uid), 'offset': 1, 'prefix_sha256': '0' * 64}):
                    assert rpc('get_translation', request).get('isError'), 'Unsafe owner/revision request accepted'
            assert not ledger.exists(), 'Invalid source identity fetched publisher bytes'
            checks.append({'check': 'All20 choices explicit; original10 descriptors and Pāli ref/text sequences frozen; changed15–21 locator revisions; foreign owners/revisions/prefixes refuse before fetch'})
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
                                 'stanzas': len(EXPECTED[uid]['labels']), 'note_count': len(EXPECTED[uid]['notes']),
                                 **{key: rows[uid][key] for key in PINS}})
            for uid, paragraph_index, label in (
                    ('thi-ap11', 1, 'ordinary stanza'), ('thi-ap16', -3, 'irregular last stanza without global number'),
                    ('thi-ap17', next(i + 1 for i, labels in enumerate(EXPECTED['thi-ap17']['labels']) if '-' in labels[0]), 'compound stanza'),
                    ('thi-ap19', next(i + 1 for i, labels in enumerate(EXPECTED['thi-ap19']['labels']) if labels[0] == '59'), 'bracketed source stanza')):
                stanza = whole[uid]['text'].split('\n\n')[paragraph_index]
                quote = stanza.split('\n')[0]
                result = tool('verify_quote', {'text': quote, 'language': 'english', 'texts': [uid], 'translation_ids': [version(uid)]})
                assert result['verdict'] != 'not_found_in_scope', label + ': poem quotation missing'
                assert result['scope']['translations_checked'][0]['translation_revision'] == commit
            for uid, label, quote in (
                    ('thi-ap11', 'publisher preface', whole['thi-ap11']['publisher_paratext']),
                    ('thi-ap17', 'recitation divider', whole['thi-ap17']['publisher_divisions'][0]['text']),
                    ('thi-ap17', 'division-only note21', whole['thi-ap17']['publisher_divisions'][0]['translator_notes'][0]['text']),
                    ('thi-ap20', 'chapter summary', whole['thi-ap20']['chapter_summary']['text'].split('\n\n')[1]),
                    ('thi-ap20', 'summary-only note27', whole['thi-ap20']['chapter_summary']['translator_notes'][0]['text'])):
                result = tool('verify_quote', {'text': quote, 'language': 'english', 'texts': [uid], 'translation_ids': [version(uid)]})
                assert result['verdict'] == 'not_found_in_scope', label + ': editorial/summary wording misowned as poem'
            checks.append({'check': 'Four ordinary/irregular/compound/bracketed stanza quote positives; preface/divider/note21/summary/note27 excluded from poem quotes'})
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            old = [{'uid': 'thi-ap' + str(n), 'title': 'Authentic pre-repair thi-ap' + str(n) + '/' + str(ref),
                                    'ref': 'thi-ap' + str(n) + '/' + str(ref), 'offset': ref - 1,
                                    'source_commit': manifest['vri_commit'], 'note': PRIVATE + ' saved ' + str(n) + '/' + str(ref)}
                                   for n, ref in [(15, 1), (16, 1), (17, 1), (18, 1), (19, 1), (20, 1), (21, 1), (15, 30), (17, 198), (19, 89), (20, 52)]]
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
                                    preface = page.get_by_role('heading', name='Publisher preface · editorial, not poem text', exact=True)
                                    assert preface.count() == int(uid == 'thi-ap11')
                                    if uid == 'thi-ap11':
                                        assert digest(preface.locator('..').locator('.translation').text_content()) == rows[uid]['paratext_sha256']
                                    summary = page.get_by_role('region', name='Canonical chapter summary · not poem text', exact=True)
                                    if uid == 'thi-ap20':
                                        expect(summary).to_have_count(1)
                                        assert digest(summary.locator('.translation').text_content()) == SUMMARY['body_sha256']
                                        assert [item.get_attribute('value') for item in summary.locator('li').all()] == ['27']
                                        assert digest(compact([{'number': 27, 'text': summary.locator('li p').text_content()}])) == SUMMARY['notes_sha256']
                                        assert '[Note 27]' not in body.text_content()
                                    else:
                                        expect(summary).to_have_count(0)
                                    divisions = page.get_by_role('region', name='Publisher recitation division · not poem text', exact=True)
                                    if uid == 'thi-ap17':
                                        expect(divisions).to_have_count(1)
                                        assert digest(divisions.locator('.translation').text_content()) == DIVISIONS[0]['body_sha256']
                                        assert digest(compact([{'number': 21, 'text': divisions.locator('li p').text_content()}])) == DIVISIONS[0]['notes_sha256']
                                        divisions.get_by_role('heading', name='Recitation notes · editorial, not poem notes', exact=True).wait_for()
                                        assert [item.get_attribute('value') for item in divisions.locator('li').all()] == ['21']
                                        assert '[Note 21]' not in body.text_content()
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
                            for uid, label, patch in (
                                    ('thi-ap20', 'revision', {'translation_revision': '0' * 40}),
                                    ('thi-ap20', 'owner', {'text_id': 'thi-ap19'}),
                                    ('thi-ap20', 'raw source', {'raw_sha256': '0' * 64}),
                                    ('thi-ap20', 'terms', {'license': 'CC BY 4.0'}),
                                    ('thi-ap20', 'poem-note ownership', {'translator_notes': whole['thi-ap20']['translator_notes'] + whole['thi-ap20']['chapter_summary']['translator_notes']}),
                                    ('thi-ap20', 'missing summary', {'chapter_summary': None}),
                                    ('thi-ap20', 'summary owner', {'chapter_summary': {**whole['thi-ap20']['chapter_summary'], 'parent_id': 'thi-ap19'}}),
                                    ('thi-ap20', 'summary root', {'chapter_summary': {**whole['thi-ap20']['chapter_summary'], 'root_sha256': '0' * 64}}),
                                    ('thi-ap20', 'summary note ownership', {'chapter_summary': {**whole['thi-ap20']['chapter_summary'], 'translator_notes': []}}),
                                    ('thi-ap17', 'missing division', {'publisher_divisions': None}),
                                    ('thi-ap17', 'division note ownership', {'publisher_divisions': [{**whole['thi-ap17']['publisher_divisions'][0], 'translator_notes': []}]}),
                                    ('thi-ap17', 'division identity', {'publisher_divisions': [{**whole['thi-ap17']['publisher_divisions'][0], 'before_local_label': '23'}]})):
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
                                if item['ref'] in ('thi-ap15/30', 'thi-ap17/198', 'thi-ap19/89', 'thi-ap20/52'):
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
                            page.goto(base + '/#read?uid=thi-ap17')
                            segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                            segment.wait_for()
                            segment.get_by_role('button', name='Save passage thi-ap17/2', exact=True).click()
                            fresh = profile(page)['saved'][-1]
                            assert fresh['ref'] == 'thi-ap17/2' and fresh['offset'] == 1
                            assert fresh['source_commit'] == manifest['vri_commit'] + '-apadana-theri11-20-v1'
                            saved(page, base)
                            bookmark_link(page, fresh).focus()
                            page.keyboard.press('Enter')
                            page.locator('.passage').first.wait_for()
                            loaded(page)
                            assert page.locator('.segment-label a').first.inner_text() == fresh['ref']
                            assert page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text() == metadata['thi-ap17']['segments'][1]['text']
                            audit('fresh revision-pinned bookmark roundtrip')
                            checks.append({'width': width, 'theme': theme, 'check': 'All10 explicit sources; paginated long poems; original note numbering; separate preface/division/summary; 12 drift refusals; old locator refusal/current review; local-only drafts/export; fresh bookmark'})
                            context.close()
                    browser.close()
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(event['ok'] for event in events)
            assert {event['url'] for event in events} == {rows[uid]['raw_url'] for uid in NEW_IDS}
            report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'publisher_revision': commit,
                      'previous_metadata_baseline': '33aa93d', 'previous_metadata_preserved': len(BASELINE), 'previous_pali_roots_preserved': len(BASELINE_ROOT_SEGMENTS),
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
    main()
