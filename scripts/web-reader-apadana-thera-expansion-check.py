#!/usr/bin/env python3
"""Actual MCP/browser checks for the nineteen independently reviewed fifth/sixth Therā additions; pinned local bytes only."""
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
from web_reader_apadana_intake import current_apadana_ids, current_family_ids
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_APADANA_EXPANSION_ā😀'
PRIVATE_MARKER = 'PRIVATE_APADANA_EXPANSION'
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
 'tha-ap32': '01fc4d83178c1bff91a52a2d6dabaeb723ce1ee49a22ff66ece1a111f33326dd',
 'tha-ap33': '4fa23ef80b877d1b9749128758bea3693ceae39566c519759fe5d44273e39f52',
 'tha-ap34': '205bdfc271aca9b55e1ef1ada6240bfff1ba28fbfee3564bbdfea89dcd490b06',
 'tha-ap35': '13392394f8369300ec8f26352955789c9ca003153eae60ac4a08bb32bceac441',
 'tha-ap36': '6c25e4e6283647d6b3d1fc1774709ee4ceeb46af4f466cadf10a8169a61eeed7',
 'tha-ap37': '9569320e1747bd875040ecd2b69fb93ae4d3c22c307bf9a12d914cd833a906a2',
 'tha-ap38': '2d7622eb76ab428a8beb399c41da575a7bc5f1ef3f6a2f5581181e055544f97a',
 'tha-ap39': '2ed0e07e82e1575f232a1a61affd3f89167735557ebc3b480e0de019837c151f',
 'tha-ap40': 'b9c11cf6583b2d41e6ca463cbcba57935e4247074ee6c06e808ca9284982a441',
 'tha-ap41': 'f5c8ea7ac1aeb647682a4cc3d9f6ae2fceb7cbeef4e96d7edb978edcbbd9dbdf',
 'tha-ap42': '81400559f68c32ff51f2d52815f856bd9a5b3726dc3db11d19a7b2575ad41c5e'}
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
BASELINE_ROOT_RECEIPTS = {'tha-ap33': [{'ref': 'tha-ap33/1',
               'type': 'heading',
               'text_sha256': 'af96125f7216b17eceb55fff57a47057d537e380cf9a6165ff98210f9303a4f8'},
              {'ref': 'tha-ap33/2',
               'type': 'heading',
               'text_sha256': '70931f313665a58871af9e16e84eb8b184a2e76fcbae22440cce765075ac9083'},
              {'ref': 'tha-ap33/3',
               'type': 'verse',
               'text_sha256': '9df55c02b75e54226287dd0eb5a944b5b40fa2522eb14a30fb5fe0b679b5b424'},
              {'ref': 'tha-ap33/4',
               'type': 'verse',
               'text_sha256': 'f45d1117c63c26de398cbba0dd3628dda6096d1129db685bf6e00c78013ade2e'},
              {'ref': 'tha-ap33/5',
               'type': 'verse',
               'text_sha256': '0da4be1b497f23f51064ef3c13efbecc36113bd38dc0f259a8cca4ab3d6bc888'},
              {'ref': 'tha-ap33/6',
               'type': 'verse',
               'text_sha256': 'e448810d9421ca20a8b0b9f0b4677368c3d24fd9efc305c39689cf7d4ee72d31'},
              {'ref': 'tha-ap33/7',
               'type': 'verse',
               'text_sha256': 'a681fd690a4860a1c31077c9d5d23b6be3ec96a4872c35c6292c339817ce588d'},
              {'ref': 'tha-ap33/8',
               'type': 'verse',
               'text_sha256': 'c4abf84d26cba7293d2f8af51d2e765d7ea41febc201de752fcb5eeef2c55e13'},
              {'ref': 'tha-ap33/9',
               'type': 'verse',
               'text_sha256': 'eb18e3bd7b57aff6959630756f801200f29ebce60c10b30e61c4347324ac7290'},
              {'ref': 'tha-ap33/10',
               'type': 'verse',
               'text_sha256': '9bad2055d0475554d585a0c2c714eccfeb35a47627f3ee72d9f9f161d366b083'},
              {'ref': 'tha-ap33/11',
               'type': 'verse',
               'text_sha256': '096a799c9750b85db1bfa4bd18ea086405e788033922d177f7b2534de76141c7'},
              {'ref': 'tha-ap33/12',
               'type': 'verse',
               'text_sha256': '7436405524b4f0da16153e6ea4a287bb701eb1627afd38870a971835585f9eb0'},
              {'ref': 'tha-ap33/13',
               'type': 'verse',
               'text_sha256': 'b6b6e3bb89e552664c8db81e773f4d3d7b83b8dd360dec45b35b4d7518c58a2d'},
              {'ref': 'tha-ap33/14',
               'type': 'verse',
               'text_sha256': '8a8b2f87a2db69e155813a848823b334fe3c742c64678de114c277cd1d516d47'},
              {'ref': 'tha-ap33/15',
               'type': 'verse',
               'text_sha256': '33e9fa2352af200af505ccd8b250aa712a32ae5450a2b26b91b03d39b38927e5'},
              {'ref': 'tha-ap33/16',
               'type': 'verse',
               'text_sha256': '37a6155209403b97638fb54266fe8bcf4f1d0f081ab85be1b617e88e4fa47c8d'},
              {'ref': 'tha-ap33/17',
               'type': 'verse',
               'text_sha256': '3fe4cc69e75d648a016fe2c9b3d3e3c92bd810fac95406d263083b89633f5d7e'},
              {'ref': 'tha-ap33/18',
               'type': 'verse',
               'text_sha256': '67b9e0a1446ef1fa07d2cbe013aed8b30e605e38a91c6ed258f862e5fe717780'},
              {'ref': 'tha-ap33/19',
               'type': 'prose',
               'text_sha256': 'e28e5160adf7769dc37d917cc4cf64f318f3544211beb0291d1cce859a139c5f'},
              {'ref': 'tha-ap33/20',
               'type': 'prose',
               'text_sha256': 'd66643f2ed283a4d3014318fca4646845535a76d2657bb554911d8106d36d0be'}],
 'tha-ap34': [{'ref': 'tha-ap34/1',
               'type': 'heading',
               'text_sha256': '1a00f59eb60efd721c47eb9874d288bc06e03c638e7cb2443fa5accb0a0dede1'},
              {'ref': 'tha-ap34/2',
               'type': 'verse',
               'text_sha256': '05287e2509021a0983251fa98cb5182ff743afd2b469082c9f7d596ea18fd321'},
              {'ref': 'tha-ap34/3',
               'type': 'verse',
               'text_sha256': '1c9babe4804c6ae66f66598f84fc917219d4c4956e3c753470674e30e9074868'},
              {'ref': 'tha-ap34/4',
               'type': 'verse',
               'text_sha256': '7b43844a938ec227ca63264c9720952d9cc6d8b33be2d584388069b98d8bcf37'},
              {'ref': 'tha-ap34/5',
               'type': 'verse',
               'text_sha256': '4b1e1232f3b2754f825152a454485816c41374d980f47c81dd9140faf4ef678b'},
              {'ref': 'tha-ap34/6',
               'type': 'verse',
               'text_sha256': '4d89dd0195f3488ffff244f58197797363ebe3c1040eec505b910651e533af0f'},
              {'ref': 'tha-ap34/7',
               'type': 'verse',
               'text_sha256': '38a140e5ed77876fdbe4f0d3401e88c937f65546759a0db1504c4252bc908a53'},
              {'ref': 'tha-ap34/8',
               'type': 'verse',
               'text_sha256': '81ba47424b4207db5cc072f6184817efc48840c5101f871296e947d80b2d5c79'},
              {'ref': 'tha-ap34/9',
               'type': 'verse',
               'text_sha256': 'ca72c6d18d3cdc9ca1af33b63dd385ed161897d7cef4153b06364d418011f1a8'},
              {'ref': 'tha-ap34/10',
               'type': 'verse',
               'text_sha256': '5a75da0428c60f2f4d856add69ef094ca100910cc2cf2d7d9b6d1fe2d0d24f86'},
              {'ref': 'tha-ap34/11',
               'type': 'verse',
               'text_sha256': '8b13895f8e98d5876e0d6b760169e7bae28b94fedf48645d7ea6efe675f1cadd'},
              {'ref': 'tha-ap34/12',
               'type': 'verse',
               'text_sha256': '105db6c7401d0404bb22929ca125d5a4de6eff2f98a8fe993d822fce2e57608f'},
              {'ref': 'tha-ap34/13',
               'type': 'verse',
               'text_sha256': 'c2915345af3989b3cd8c81c34b8166af6165397e3670b824e0cbf9455648f943'},
              {'ref': 'tha-ap34/14',
               'type': 'verse',
               'text_sha256': '157d8216901a94f090cb937437020aa15167bb88dec1c6e7953f979a73834ea2'},
              {'ref': 'tha-ap34/15',
               'type': 'verse',
               'text_sha256': '7e580c9eaabe19dc0612e854cbd200782d78fd0a7fb8e30cede8cd01a2a8cd5f'},
              {'ref': 'tha-ap34/16',
               'type': 'prose',
               'text_sha256': '68bbbc1e48d7efc4f2b5c7c8cafe5becd49c1eeef0f243fd7bc45b8f85880420'},
              {'ref': 'tha-ap34/17',
               'type': 'prose',
               'text_sha256': '0a8d3d3d56f9fe9b5223e6fdbeccbc2fc607ac3224e6904be133522bed5c9ac3'}],
 'tha-ap35': [{'ref': 'tha-ap35/1',
               'type': 'heading',
               'text_sha256': 'bd6cb8670ef3ce6d3dd42eb16579dfa0126d4f5a53bf8fa47891dcc1622a65b6'},
              {'ref': 'tha-ap35/2',
               'type': 'verse',
               'text_sha256': '66d8b6667b2877782f8be92268e84c8269d7577d16e3a176673c36682c2c8c58'},
              {'ref': 'tha-ap35/3',
               'type': 'verse',
               'text_sha256': '91adcfac6826a30018a9636a2c7e5088e4e977af823be17b545d7bb810d48f70'},
              {'ref': 'tha-ap35/4',
               'type': 'verse',
               'text_sha256': '422909806cde2ec51e28b878b25aef94ce115f9a42518378856c6ee2031254b8'},
              {'ref': 'tha-ap35/5',
               'type': 'verse',
               'text_sha256': '503b7da70c07ec500c3118897ec8a8ec367d759b2a00e1e75a4a82081258b1ca'},
              {'ref': 'tha-ap35/6',
               'type': 'verse',
               'text_sha256': 'f852cd4e3a481433701d148a0acad39e26787f9de9386444ad154770de958976'},
              {'ref': 'tha-ap35/7',
               'type': 'verse',
               'text_sha256': '6efaea2d540d614ffa4532a6f265842c6862810a2cebb94eee103d48424cc5cb'},
              {'ref': 'tha-ap35/8',
               'type': 'verse',
               'text_sha256': 'eb5b100d607e43a8a9971c0974b9dc761b3f8d65c60348ffac31f161a9c8c290'},
              {'ref': 'tha-ap35/9',
               'type': 'verse',
               'text_sha256': 'e736eecfec0dc67c41a7348ebec617784d30be551176bca9fa9df223902af28a'},
              {'ref': 'tha-ap35/10',
               'type': 'verse',
               'text_sha256': 'ba9eed68ade8a37de33d871b499e177c8fe6d7f40ee75c8571f328f422305eda'},
              {'ref': 'tha-ap35/11',
               'type': 'verse',
               'text_sha256': '9bad2055d0475554d585a0c2c714eccfeb35a47627f3ee72d9f9f161d366b083'},
              {'ref': 'tha-ap35/12',
               'type': 'verse',
               'text_sha256': 'af353252276e7e452d59cde694b9cfdd455a22aba80d375895b4d52be03c23c4'},
              {'ref': 'tha-ap35/13',
               'type': 'verse',
               'text_sha256': '0558415a06f70db13d35fd1c274be406c2cde298ab3b16f835a524a87425431f'},
              {'ref': 'tha-ap35/14',
               'type': 'verse',
               'text_sha256': '4308559262f45e39b9e6d26aba5e88bbcc1f6aa2fe817298907b80e36a36c271'},
              {'ref': 'tha-ap35/15',
               'type': 'verse',
               'text_sha256': 'fd6527a72cc189af5f43ed3799539e9515804faf8f7f15c8e595f074a40da4cd'},
              {'ref': 'tha-ap35/16',
               'type': 'verse',
               'text_sha256': '33272853d4e0c35e2fcc2295fdd175046d3df0a862fe5fb3225e8d21b242dfb6'},
              {'ref': 'tha-ap35/17',
               'type': 'verse',
               'text_sha256': '4ce18f8a3b6b49486cdd056a435765b459524e1c4af3daaa140d777e30083f66'},
              {'ref': 'tha-ap35/18',
               'type': 'verse',
               'text_sha256': '7e580c9eaabe19dc0612e854cbd200782d78fd0a7fb8e30cede8cd01a2a8cd5f'},
              {'ref': 'tha-ap35/19',
               'type': 'prose',
               'text_sha256': '62b1fa3f0ed76f4083762d7df027fb7ab5940287b1cbfe04f5dbb90474d5665b'},
              {'ref': 'tha-ap35/20',
               'type': 'prose',
               'text_sha256': '38d0b9b8028eca3d4db2d5dfb07ab06fcbfdc8d6913ce347772d0005529acf4b'}],
 'tha-ap36': [{'ref': 'tha-ap36/1',
               'type': 'heading',
               'text_sha256': '067d0bc115a6e06d0f049c00b9a192b73a3d32247366a5fd056051c067ad6e2e'},
              {'ref': 'tha-ap36/2',
               'type': 'verse',
               'text_sha256': 'a8572e929b7d272a4262008dfb19bd50913861befc9e2d70cdef13878cddcaf7'},
              {'ref': 'tha-ap36/3',
               'type': 'verse',
               'text_sha256': '5e9f9d606dea7904fc47ce929a929e3bf44e72d252ff51864572d74dcb148016'},
              {'ref': 'tha-ap36/4',
               'type': 'verse',
               'text_sha256': 'c8a1723fbe872d362cfac77b1807d4bd1d5d2770ad9143d1d79ae47472ee73a6'},
              {'ref': 'tha-ap36/5',
               'type': 'verse',
               'text_sha256': '5d9cf213a9e175eb797265afcb5b6b0b92c71856e04707223ad9fefceaa0eae3'},
              {'ref': 'tha-ap36/6',
               'type': 'verse',
               'text_sha256': '1d0a0ebc7fae76f9645a49285295e5ed14cb226d5af649738316fbe0aa4ad05a'},
              {'ref': 'tha-ap36/7',
               'type': 'verse',
               'text_sha256': '30eaee2a4cc4a0eda7d94b3346bb8b471a6e84f68f2dddecedfd1617026438f8'},
              {'ref': 'tha-ap36/8',
               'type': 'verse',
               'text_sha256': '3fa62be305b8515dfac2a55c3ce6a5be5a10d8444157262a3c6edfe1ee958ff0'},
              {'ref': 'tha-ap36/9',
               'type': 'verse',
               'text_sha256': '0446e3a4ad2fa9602621f9d96eff15d3c624a123f1e26c120ab3eec96f2ec2d6'},
              {'ref': 'tha-ap36/10',
               'type': 'verse',
               'text_sha256': 'f1c9a353dfea2ff91c389418641aa6f1a9a2eaa8c44387fa3404b21a2942578e'},
              {'ref': 'tha-ap36/11',
               'type': 'verse',
               'text_sha256': 'bc137213ef65322aa50969f71fb70c97886eafe79988e05e65cfcbc176a8132c'},
              {'ref': 'tha-ap36/12',
               'type': 'verse',
               'text_sha256': '2bbaf0eb78454e9da51c69239a216724e140e0543ce8145c2ff9e1f4e212f226'},
              {'ref': 'tha-ap36/13',
               'type': 'verse',
               'text_sha256': '2e194a895979b6ade5b575837df644debd6326683576aef15229b9cd6448d3d6'},
              {'ref': 'tha-ap36/14',
               'type': 'verse',
               'text_sha256': '695fcd71217cb7163ba07b112191e9dc32fc8f44fe049725dbf5d7f32481216e'},
              {'ref': 'tha-ap36/15',
               'type': 'verse',
               'text_sha256': '7a72c453f06b4dc362ad3b365df48f837fc0bf782a17178a75200610a849b1fb'},
              {'ref': 'tha-ap36/16',
               'type': 'verse',
               'text_sha256': 'dbe15b61b9e405d3d68d205eb0452743ce358ae581411d56066bb074db9f8df8'},
              {'ref': 'tha-ap36/17',
               'type': 'verse',
               'text_sha256': 'cf63df43303769cfeaac8349a8b760aac98863429ca7ef2ffa4a0a8318e2432a'},
              {'ref': 'tha-ap36/18',
               'type': 'prose',
               'text_sha256': 'afa722dd2b5a2c3aa4fbe8f0311f0f1a989166025d45ca8dc45391e23f8d9f1a'}],
 'tha-ap37': [{'ref': 'tha-ap37/1',
               'type': 'heading',
               'text_sha256': 'e0880ee77197ef801370c7d448e06987c2bb911d2f73ad3242ed9baeb98c8b4f'},
              {'ref': 'tha-ap37/2',
               'type': 'verse',
               'text_sha256': 'd8bc486d675129dcf74dd301e964993eb1ea69f3112882ad11909e75e8c92fe9'},
              {'ref': 'tha-ap37/3',
               'type': 'verse',
               'text_sha256': '93c3d3cc8430827db9719455aaff85464a32dda635f351459fda37a420898b58'},
              {'ref': 'tha-ap37/4',
               'type': 'verse',
               'text_sha256': '7065c8ec4d8a220b88405f94c91d5369ee68431cddd9fc717a7238e7aebfa9dd'},
              {'ref': 'tha-ap37/5',
               'type': 'verse',
               'text_sha256': '1b64ea887a25eb6f199889fed64c73198af269e6e76c0e23877b4de5e39b4b51'},
              {'ref': 'tha-ap37/6',
               'type': 'verse',
               'text_sha256': '0f80f11256a6435fd0b76e9f6139ebdd96b69b0c129963d6b8303a92d995ee01'},
              {'ref': 'tha-ap37/7',
               'type': 'verse',
               'text_sha256': 'e4201c731932583ec6c714b6958a647be56bee29ab7747d272438a04de13a688'},
              {'ref': 'tha-ap37/8',
               'type': 'verse',
               'text_sha256': 'dd1999f04648f309f364ec7d9699e67377bedc55d5433e5614c042a03c16e159'},
              {'ref': 'tha-ap37/9',
               'type': 'verse',
               'text_sha256': '3faab209921625da23b2ce88cd41d1981e5b97396dc9b13c0cbfbbd3cb94d46e'},
              {'ref': 'tha-ap37/10',
               'type': 'verse',
               'text_sha256': 'e9221f146b60a2cc16161764641cb531ca9f1265be07ad998984ef868acca58d'},
              {'ref': 'tha-ap37/11',
               'type': 'verse',
               'text_sha256': '1a291d0b6d4c1c455d4722bb7a39ec62b89dc79cf324ee88c52cb1fa54996521'},
              {'ref': 'tha-ap37/12',
               'type': 'verse',
               'text_sha256': '7976163d063b8b63f72b3ee26209e7aaa3119912d2a41a59be64d5bb8c48d46d'},
              {'ref': 'tha-ap37/13',
               'type': 'verse',
               'text_sha256': '5fe3614e048971ccdd506f578c9f89fc389ca4b4875cacc34ce487eec778273a'},
              {'ref': 'tha-ap37/14',
               'type': 'verse',
               'text_sha256': '3112ecff5b19b4e2a9bdfa7281d390b2db13168f1469f2df9523782cdb10521a'},
              {'ref': 'tha-ap37/15',
               'type': 'verse',
               'text_sha256': 'c64a6c3197e1be6dd901362a432038cd2783b55dca93816689809547dcd81117'},
              {'ref': 'tha-ap37/16',
               'type': 'verse',
               'text_sha256': 'dc759c82ac963462bb96c222b146c2989600039639e79d5d5c82fdd75d16266e'},
              {'ref': 'tha-ap37/17',
               'type': 'verse',
               'text_sha256': 'bc6a2c4fa1d60c009f672369213df85a5cd6b71240d380645bff6c140d14bf02'},
              {'ref': 'tha-ap37/18',
               'type': 'verse',
               'text_sha256': 'f6e7b5b20b1da63feb15072f0636f267acf841a43d14a2da7f4f89c8e2cebf2d'},
              {'ref': 'tha-ap37/19',
               'type': 'verse',
               'text_sha256': 'aadf2b6155ae05e4626d04a13fd7ccc125789d347f1ce237bc40fee490d183ca'},
              {'ref': 'tha-ap37/20',
               'type': 'verse',
               'text_sha256': '8c2bc3373ea4e5eb5dd09a4c3d4c3ee4c7b881cdaf06a4725130809a3d6fbad4'},
              {'ref': 'tha-ap37/21',
               'type': 'verse',
               'text_sha256': 'a87ec51bfe6c7eaa0f7be8f6df4d2a776d67d902017ad86f87406912e382222c'},
              {'ref': 'tha-ap37/22',
               'type': 'prose',
               'text_sha256': 'f0f55abdda462b75ce2c39f4657a68b972b38882d46f725003ca4a5dfbec5035'}],
 'tha-ap38': [{'ref': 'tha-ap38/1',
               'type': 'heading',
               'text_sha256': '10e3802e43e3b3f43e6cf36e794d718ca72d9ab8f5bdea7e5daa9df7610fad20'},
              {'ref': 'tha-ap38/2',
               'type': 'verse',
               'text_sha256': '6750b10f73b754aa5681b94a83be6dc6720bbf1765515bc913949330f214e228'},
              {'ref': 'tha-ap38/3',
               'type': 'verse',
               'text_sha256': '62c59352b94ffc305ac16a614b229296d2ae5f349514951545fb03ee6758f66e'},
              {'ref': 'tha-ap38/4',
               'type': 'verse',
               'text_sha256': 'f9424336ff045c2688505ad1dddfe83eed46bfe89797f58df4092ed6079ee51c'},
              {'ref': 'tha-ap38/5',
               'type': 'verse',
               'text_sha256': 'd3bf47abc17edc5301b56435cbabae2bea506ae72e212a35a300beea431b9ca6'},
              {'ref': 'tha-ap38/6',
               'type': 'verse',
               'text_sha256': '7b3b94ab7f0a83a77627f67a4c8fb30014dec3e1405c6963bf3ec1bcaa72b327'},
              {'ref': 'tha-ap38/7',
               'type': 'prose',
               'text_sha256': '2d41af2e0402206a7fae9e0bd507b41300f533481d8252c75bafd6bad8f65d86'}],
 'tha-ap39': [{'ref': 'tha-ap39/1',
               'type': 'heading',
               'text_sha256': 'a656dbfb93d7e196bfca98c4d887fe2848b11e9ef9e545d86ba18d0225838b42'},
              {'ref': 'tha-ap39/2',
               'type': 'verse',
               'text_sha256': 'f410d03528dc219a6799a89c7f9db38b5d8a4023cd52e3dbc27007afb18ed057'},
              {'ref': 'tha-ap39/3',
               'type': 'verse',
               'text_sha256': '764060e284f7030732dd6d9f8d4fbdf9a8646def8673733a7e3967ed01854e5a'},
              {'ref': 'tha-ap39/4',
               'type': 'verse',
               'text_sha256': '642eb6ff995bf94ea4c4fb9a01d4832ca532ec9643ce41a49d3122cf763a40c8'},
              {'ref': 'tha-ap39/5',
               'type': 'verse',
               'text_sha256': 'de400e9955cee1f6630a17c73548179b0c90352e730254debfa6449c1eee9ad8'},
              {'ref': 'tha-ap39/6',
               'type': 'verse',
               'text_sha256': 'e100632c4e7b1610c590f0bc3cadaabb84592d43d702aed7eb826bbfe38c65b5'},
              {'ref': 'tha-ap39/7',
               'type': 'prose',
               'text_sha256': '247a52d34704f919cdf881d8a6e267d82b04548ab422de31fdc53159d91cb2db'}],
 'tha-ap40': [{'ref': 'tha-ap40/1',
               'type': 'heading',
               'text_sha256': 'c28a379018b065f8836360340fac7a81575ea13a25a1db0b5be98296cdf06a58'},
              {'ref': 'tha-ap40/2',
               'type': 'verse',
               'text_sha256': '7153f40f882cdf7e45dbccd9846ceb3a28cde2e8d1dedefa5ecf039d6e2aa5ef'},
              {'ref': 'tha-ap40/3',
               'type': 'verse',
               'text_sha256': '55ff2a4929dac2c77d50b29d73c328bc51a40bf29c565aa9d19019bb8c42412e'},
              {'ref': 'tha-ap40/4',
               'type': 'verse',
               'text_sha256': '492621b58aca03da328a6a14c87141183da62d9fd6aaa6329385c0aff072f81f'},
              {'ref': 'tha-ap40/5',
               'type': 'verse',
               'text_sha256': 'af8649c50027232ec6fa071a985831cd3c5ecf3e73db32c89f2b37f5bebb8a73'},
              {'ref': 'tha-ap40/6',
               'type': 'verse',
               'text_sha256': '22353d4a15df775e288ad07111e66a65ce07c099bd48c61dacbf220828a4027b'},
              {'ref': 'tha-ap40/7',
               'type': 'verse',
               'text_sha256': '2a3bd742021a95538281db3b1aca57e1eaa26e225b98e846b3951b70ea7578f0'},
              {'ref': 'tha-ap40/8',
               'type': 'verse',
               'text_sha256': 'da1eb3b5e977140fea793d5fd80d1557bdb68aec0e2bff3d8c73e04be818e3cb'},
              {'ref': 'tha-ap40/9',
               'type': 'verse',
               'text_sha256': '7e580c9eaabe19dc0612e854cbd200782d78fd0a7fb8e30cede8cd01a2a8cd5f'},
              {'ref': 'tha-ap40/10',
               'type': 'prose',
               'text_sha256': '4cac5b0b6dcfa86946585e1baca51e4f31198f9c972ecc9da50d5198e7e486fa'},
              {'ref': 'tha-ap40/11',
               'type': 'prose',
               'text_sha256': '3301adcb5c4192e12a90fdff7e7dcf4185036c506e771917faf224f95058c9a3'}],
 'tha-ap41': [{'ref': 'tha-ap41/1',
               'type': 'heading',
               'text_sha256': 'bb12d0d931ee44f8b90d4d685e030c50b5595fc75e868f2140ae551f04fc383d'},
              {'ref': 'tha-ap41/2',
               'type': 'verse',
               'text_sha256': 'f3076c67e36ea944bb1175d7eee0b65905699455c2e277bd3720318d217685c2'},
              {'ref': 'tha-ap41/3',
               'type': 'verse',
               'text_sha256': '421b54af0dd1e3331643564fd41b3d2ec1a0e8a7cdd79183caebb9001266208e'},
              {'ref': 'tha-ap41/4',
               'type': 'verse',
               'text_sha256': 'a689cfe3dca25818adf6bf48859ed47c3c839d3b09c435ae26665164c26f0f0d'},
              {'ref': 'tha-ap41/5',
               'type': 'verse',
               'text_sha256': 'cb86fdacb09bd3c32d2eb0adf771983fe8b2bab6fa3b88a6d7d16fdf12505dfe'},
              {'ref': 'tha-ap41/6',
               'type': 'verse',
               'text_sha256': '0d957ca4d5f8275f3bc4153fb6f17a555876ed7602c19ed81b90d420b7d4310d'},
              {'ref': 'tha-ap41/7',
               'type': 'verse',
               'text_sha256': '7e580c9eaabe19dc0612e854cbd200782d78fd0a7fb8e30cede8cd01a2a8cd5f'},
              {'ref': 'tha-ap41/8',
               'type': 'prose',
               'text_sha256': '2b855a00e8b44e8be42369d9e61d04467fe61757beca550d763f06304b52ee85'},
              {'ref': 'tha-ap41/9',
               'type': 'prose',
               'text_sha256': '1022eb6c0d2a0db3c558ca22c2c8e853277e0cc4f2dfd8a09cc442d23b85c90f'}],
 'tha-ap42': [{'ref': 'tha-ap42/1',
               'type': 'heading',
               'text_sha256': 'edb02ae3dcdae51066b9158cbb07fe15ac63305320bd5b926ae4f3e692e8e8d0'},
              {'ref': 'tha-ap42/2',
               'type': 'verse',
               'text_sha256': 'b987822aecb112ba9785b23465593336ba90f0738cb2da6323951c32b6203106'},
              {'ref': 'tha-ap42/3',
               'type': 'verse',
               'text_sha256': '71d7bc21dc7e20da82e52a624dd2975b64af790e7533c9b7c2cb6c436d4cc030'},
              {'ref': 'tha-ap42/4',
               'type': 'verse',
               'text_sha256': 'b6fce3f972ce18afe868abb77e5387affe84856dbb54e4b5400bb31611df482d'},
              {'ref': 'tha-ap42/5',
               'type': 'verse',
               'text_sha256': 'ff5d0ffa1317369c399430a0bc77e459cac35dab7c4a5fe91e0416261a5af5ff'},
              {'ref': 'tha-ap42/6',
               'type': 'verse',
               'text_sha256': 'a972b4b524fb1fca721f7da560dbc61adb170269d6b95d7e772991884882ff2d'},
              {'ref': 'tha-ap42/7',
               'type': 'verse',
               'text_sha256': '7e580c9eaabe19dc0612e854cbd200782d78fd0a7fb8e30cede8cd01a2a8cd5f'},
              {'ref': 'tha-ap42/8',
               'type': 'prose',
               'text_sha256': '50a8bebbcccad12448a54509700a6bdfe02adb56a82523bf2cccd4f106145edf'},
              {'ref': 'tha-ap42/9',
               'type': 'prose',
               'text_sha256': '9e1363d7f9e021bc3262d54c4db6ec69f93c8413466ce920fb3455017ccf826c'},
              {'ref': 'tha-ap42/10',
               'type': 'prose',
               'text_sha256': '8ad772970e612b2f00788e49eb125ac343222cd36545441f635ecb43c787637c'},
              {'ref': 'tha-ap42/11',
               'type': 'prose',
               'text_sha256': '67a4c9f8fb9153db7fddd800b94ba1c2915cecec6690962c6fd9f04ad7005ecd'},
              {'ref': 'tha-ap42/12',
               'type': 'verse',
               'text_sha256': '21fd92052e21ea54cfa72cadba488a969fcb58c30c8b5561970c34620cd5d67b'}]}
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
# Source-scope approvals are independent of final runtime/release readiness.
GOLDEN_PINS = {
    'THERA_FIFTH_GOLDENS.json': 'b5ee36b8a8993f9a9b6348d5f68d6a23a1235f268f45546a246484882e2efe8f',
    'THERA_SIXTH_GOLDENS.json': '3ad2b60e26d0da364e71ea024aae6bc1348d731a4fd5229f323184a8321256e1',
}

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
    page.get_by_label('Search saved passages and notes', exact=True).fill('')


def bookmark_link(page, item):
    page.get_by_label('Search saved passages and notes', exact=True).fill(item['title'])
    return page.get_by_role('region', name='Saved passage results').get_by_role(
        'link', name=item['title'] + ' · ' + item['ref'], exact=True)


def open_summary(page, link, uid, old_uid, controlled=False):
    """Bind readiness to the requested destination response, URL, reference and wording."""
    if controlled:
        page.evaluate('uid=>{window.expansionGate={uid,held:null,released:false}}', uid)
    def wanted(response):
        request = response.request
        if request.method != 'POST' or not request.url.endswith('/mcp'):
            return False
        command = (request.post_data_json or {}).get('params', {})
        return command.get('name') == 'get_text' and command.get('arguments', {}).get('uid') == uid
    with page.expect_response(wanted) as received:
        link.focus()
        page.keyboard.press('Enter')
        if controlled:
            page.wait_for_function('()=>Boolean(window.expansionGate.held)')
            assert page.locator('.segment-label a').first.inner_text() == old_uid + '/1'
            page.evaluate("""()=>{const s=window.expansionGate,event=s.held;s.held=null;s.released=true;
              window.dispatchEvent(new HashChangeEvent('hashchange',event))}""")
    response = received.value
    assert response.ok
    result = response.json()['result']
    assert not result.get('isError') and result['structuredContent']['text_id'] == uid
    page.wait_for_function("uid=>location.hash.startsWith('#read?')&&new URLSearchParams(location.hash.slice(6)).get('uid')===uid", arg=uid)
    assert parse_qs(urlsplit(page.url).fragment.split('?', 1)[1])['uid'] == [uid]
    expect(page.locator('.segment-label a').first).to_have_text(uid + '/1')
    loaded(page)
    assert page.locator('.passage').first.inner_text() == result['structuredContent']['segments'][0]['text']
    return {'destination_uid': uid, 'destination_reference': uid + '/1',
            'event_delivery': 'controlled-hashchange' if controlled else 'native-hashchange'}


def tamper_patches(whole):
    patches = [('tha-ap52', 'revision', {'translation_revision': '0' * 40}),
        ('tha-ap52', 'wrong owner', {'text_id': 'tha-ap62'}),
        ('tha-ap52', 'raw source', {'raw_sha256': '0' * 64}),
        ('tha-ap52', 'root source', {'root_sha256': '0' * 64}),
        ('tha-ap52', 'terms', {'license': 'CC BY 4.0'}),
        ('tha-ap52', 'license link', {'license_url': 'https://creativecommons.org/licenses/by/4.0/'}),
        ('tha-ap52', 'attribution', {'attribution': ''}),
        ('tha-ap52', 'changes notice', {'changes': ''}),
        ('tha-ap52', 'mapping notices', {'mapping_notes': []}),
        ('tha-ap52', 'visible notices', {'notes': []}),
        ('tha-ap52', 'both notice fields', {'mapping_notes': [], 'notes': []}),
        ('tha-ap52', 'missing summary', {'chapter_summary': None}),
        ('tha-ap52', 'summary owner', {'chapter_summary': {**whole['tha-ap52']['chapter_summary'], 'parent_id': 'tha-ap62'}}),
        ('tha-ap52', 'summary source', {'chapter_summary': {**whole['tha-ap52']['chapter_summary'], 'root_sha256': '0' * 64}}),
        ('tha-ap52', 'summary note ownership', {'chapter_summary': {**whole['tha-ap52']['chapter_summary'], 'translator_notes': whole['tha-ap52']['translator_notes']}}),
        ('tha-ap51', 'missing division', {'publisher_divisions': []})]
    for field, value in (('parent_id', 'tha-ap52'), ('before_local_label', '14'), ('before_publisher_label', '1228'), ('root_sha256', '0' * 64)):
        patches.append(('tha-ap51', 'division ' + field.replace('_', ' '), {'publisher_divisions': [{**whole['tha-ap51']['publisher_divisions'][0], field: value}]}))
    return patches


def check_widgets(browser, html, widgets, patches, width, theme, checks):
    """Run the packaged HTML with real MCP payloads and labelled simulated hosts."""
    for bridge in ('MCP Apps', 'Apps SDK'):
        page = browser.new_page(viewport={'width': width, 'height': 900})
        errors, traffic = [], []
        page.on('pageerror', lambda error: errors.append(type(error).__name__))
        page.route('**/*', lambda route: (traffic.append('unexpected widget request'), route.abort()))
        if bridge == 'MCP Apps':
            page.set_content('<style>body{margin:0}iframe{border:0;width:100%;height:850px}</style>')
            page.evaluate("""input=>{window.bridgeMessages=[];const frame=document.createElement('iframe');frame.id='reader';
              window.addEventListener('message',ev=>{window.bridgeMessages.push(ev.data);
                if(ev.data.method==='ui/initialize')frame.contentWindow.postMessage({jsonrpc:'2.0',id:ev.data.id,result:{hostContext:{theme:input.theme},hostCapabilities:{serverTools:{},openLinks:{},updateModelContext:{structuredContent:{}}}}},'*');
                if(ev.data.method==='ui/update-model-context')frame.contentWindow.postMessage({jsonrpc:'2.0',id:ev.data.id,result:{}},'*')});
              frame.srcdoc=input.html;document.body.append(frame)}""", {'html': html, 'theme': theme})
            page.wait_for_function("window.bridgeMessages.some(m=>m.method==='ui/notifications/initialized')")
            frame = page.frames[1]
            frame.evaluate("""()=>{window.testDeliveries=0;window.addEventListener('message',event=>{if(event.data?.method==='ui/notifications/tool-result')window.testDeliveries++})}""")
            def send(data):
                before = frame.evaluate('window.testDeliveries')
                page.evaluate("data=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:data}},'*')", data)
                frame.wait_for_function('before=>window.testDeliveries>before', arg=before)
        else:
            page.evaluate("""theme=>{window.openai={theme,setWidgetState(){},openExternal(){},callTool(){throw Error('Unexpected widget tool action')}}}""", theme)
            page.set_content(html)
            frame = page.main_frame
            def send(data):
                page.evaluate("data=>{window.openai.toolOutput=data;window.dispatchEvent(new Event('openai:set_globals'))}", data)
        for uid, widget in widgets.items():
            send(widget)
            expect(frame.locator('#title')).to_have_text(widget['citation'] + (' · ' + widget['title'] if widget.get('title') else ''))
            expect(frame.locator('#english > div.en')).to_have_text(widget['english']['text'])
            assert all(note in frame.locator('#english').text_content() for note in widget['english']['mapping_notes'])
            assert all(segment['text'] in frame.locator('#pali').text_content() for segment in widget['pali']['segments'])
            assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
        for uid, label, patch in patches:
            widget = widgets[uid]
            send(widget)
            expect(frame.locator('#english > div.en')).to_have_text(widget['english']['text'])
            mutated = {**widget, 'english': {**widget['english'], **patch}}
            if 'text_id' in patch:
                mutated['text_id'] = patch['text_id']
            send(mutated)
            expect(frame.locator('#english .en')).to_have_count(0)
            assert all(segment['text'] in frame.locator('#pali').text_content() for segment in widget['pali']['segments'])
        assert not errors and not traffic
        checks.append({'width': width, 'theme': theme, 'bridge': bridge,
            'check': 'Packaged widget HTML; actual MCP payloads accepted;source/notices/summary/division mutations refused before English;Pāli retained;zero network;simulated host bridge only', 'sources': len(widgets), 'tamper_refusals': len(patches)})
        page.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True, type=Path)
    parser.add_argument('--server-dir', type=Path)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--a11y', action='store_true', help='Test-only CSP bypass for axe injection')
    modes.add_argument('--mcp-only', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
    manifest = json.loads((server_dir / 'data/apadana.json').read_text())
    assert manifest == json.loads((ROOT / 'server/data/apadana.json').read_text())
    assert manifest['source']['commit'] == SOURCE_REVISION
    assert len(GOLDEN_PINS) == 2, 'Independent review receipts are not final'
    goldens = []
    for name, pin in GOLDEN_PINS.items():
        path = ROOT / 'docs/evidence/apadana' / name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == pin
        evidence = json.loads(path.read_text())
        assert evidence['publisher_revision'] == SOURCE_REVISION
        assert evidence['baseline'] == 'a154013eded45f6ee319fff5cc246ed563811c55'
        goldens.extend(evidence['poems'])
    expected = {p['id']: p for p in goldens if p['source_scope_decision'].startswith('APPROVE')}
    combined_rows, new_ids = manifest['links'], tuple(expected)
    assert set(combined_rows) == set(current_apadana_ids(ROOT)), 'Unexpected combined publisher-source scope'
    # Keep every D249 source/hash/policy gate scoped to its exact historical eighty-nine choices.
    historical_ids = set(BASELINE) | set(expected)
    rows = {uid: row for uid, row in combined_rows.items() if uid in historical_ids}
    assert len(expected) == 19 and len(BASELINE) == len(BASELINE_ROOT_SEGMENTS) + len(BASELINE_ROOT_RECEIPTS) == 70
    assert set(rows) == historical_ids and len(rows) == 89
    for uid, pin in BASELINE.items():
        assert digest(compact(rows[uid], sort=True)) == pin, uid + ': previous source metadata changed'
    for uid, receipt in expected.items():
        row = rows[uid]
        for key in PINS:
            assert row[key] == (receipt['root'][key] if key == 'root_sha256' else receipt[key])
        assert row['poem'] == receipt['poem'] and row['title'] == receipt['title']
        assert row['publisher_chapter'] == receipt['publisher_chapter']
        assert row['note_numbers'] == receipt['note_numbers'] and row['note_count'] == receipt['note_count']
        assert row['stanza_layout'] == receipt['stanza_layout']
        assert row['path'] == '/text/' + receipt['path'].removeprefix('src/_poems/').removesuffix('.md') + '/'
    checkout = args.source_root.resolve()
    assert subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip() == SOURCE_REVISION
    assert {a['path']: a['sha256'] for a in manifest['source']['rights_artifacts']} == RIGHTS
    files, artifacts = {}, []
    for evidence_name in GOLDEN_PINS:
        evidence = json.loads((ROOT / 'docs/evidence/apadana' / evidence_name).read_text())
        for artifact in [*evidence['rights'], evidence['publisher_routing'], *evidence['poems']]:
            local = (checkout / artifact['path']).resolve()
            assert local.is_relative_to(checkout)
            raw = local.read_bytes()
            assert len(raw) == artifact['bytes']
            assert hashlib.sha256(raw).hexdigest() == artifact['raw_sha256']
            assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == artifact['git_blob_sha1']
            assert subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', SOURCE_REVISION + ':' + artifact['path']], text=True).strip() == artifact['git_blob_sha1']
            artifacts.append({'path': artifact['path'], 'git_blob_sha1': artifact['git_blob_sha1'], 'sha256': artifact['raw_sha256']})
    for row in rows.values():
        local = (checkout / row['raw_url'].split(SOURCE_REVISION + '/', 1)[1]).resolve()
        assert local.is_relative_to(checkout)
        assert hashlib.sha256(local.read_bytes()).hexdigest() == row['raw_sha256']
        files[row['raw_url']] = str(local)
    root_probe = """import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';
      import {createHash} from 'node:crypto';import {readBundled} from './src/bundled-data.mjs';
      let input='';for await(const chunk of process.stdin)input+=chunk;const p=JSON.parse(input);
      const canon=JSON.parse(gunzipSync(readBundled(p.path)));
      for(const [uid,g] of Object.entries(p.roots)){
        const u=canon.units.find(u=>u.id===uid);assert(u);assert.equal(u.book,g.book);assert.equal(u.start,g.start);assert.equal(u.end,g.end);
        const raw={id:u.id,book:u.book,start:u.start,end:u.end,blocks:canon.books[u.book].blocks.slice(u.start,u.end)};
        assert.equal(createHash('sha256').update(JSON.stringify(raw)).digest('hex'),g.root_sha256,uid);
      }
      process.stdout.write(JSON.stringify({verified:Object.keys(p.roots).length}));"""
    root_run = subprocess.run(['node', '--input-type=module', '-e', root_probe], cwd=ROOT,
        input=compact({'path': str(server_dir / 'data/canon.json.gz'), 'roots': {uid: g['root'] for uid, g in expected.items()}}), text=True, capture_output=True)
    assert root_run.returncode == 0 and json.loads(root_run.stdout)['verified'] == 19, 'Independent raw root mapping receipt differs'
    def version(uid):
        return 'ap:' + rows[uid]['path'].removeprefix('/text/').rstrip('/')
    with TemporaryDirectory(prefix='pali-apadana-expansion-') as work:
        stage, checks, scans, receipts = Path(work), [], [], []
        ledger, preload = stage / 'fetches.jsonl', stage / 'provider.cjs'
        preload.write_text("const fs=require('node:fs'),files=" + json.dumps(files)
            + ";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);"
            + "const ok=Object.hasOwn(files,url);fs.appendFileSync(" + json.dumps(str(ledger))
            + ",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');"
            + "return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        server = subprocess.Popen(['node', '--require', str(preload), str(server_dir / 'http.cjs')], cwd=stage,
            env={**os.environ, 'HOST': '127.0.0.1', 'PORT': str(port), 'RATE_LIMIT_PER_MINUTE': '0', 'CHATGPT_WIDGET': '1'},
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        def protocol(method, params):
            body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params}).encode()
            req = urllib.request.Request(base + '/mcp', data=body, headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
            with urllib.request.urlopen(req, timeout=90) as response:
                return json.load(response)['result']
        def rpc(name, arguments):
            return protocol('tools/call', {'name': name, 'arguments': arguments})
        def tool(name, arguments):
            result = rpc(name, arguments)
            assert not result.get('isError'), name + ': unexpected MCP error'
            return result['structuredContent']
        def source(data, uid):
            row, golden = rows[uid], expected[uid]
            assert data['text_id'] == uid and data['translation_id'] == version(uid)
            assert data['translation_revision'] == SOURCE_REVISION
            assert data['url'] == row['url'] and data['fetched_url'] == row['raw_url']
            assert data['license'] == 'CC BY-NC-SA 4.0' and data['license_url'] == LICENSE_URL
            assert 'Walters' in data['attribution'] and 'Whitman College' in data['attribution'] and data['changes']
            assert 'translation_scope' not in data and data.get('whole_unit_coverage') is not False
            assert all(data[key] == row[key] for key in PINS)
            assert data['mapping_notes'] == row['mapping_notes'] and row['mapping_notes']
            assert all(note in data['notes'] for note in row['mapping_notes'])
            assert [note['number'] for note in data['translator_notes']] == golden['note_numbers']
            assert digest(compact(data['translator_notes'])) == golden['notes_sha256']
            assert [digest(note['text']) for note in data['translator_notes']] == [n['body_sha256'] for n in golden['notes'] if n['owner'] == 'poem']
            assert digest(data['publisher_paratext']) == golden['paratext_sha256']
            for key in ('publisher_preface', 'chapter_summary', 'collection_summary'):
                contract = row.get(key)
                scope = data.get(key)
                if contract:
                    assert scope and all(scope[k] == v for k, v in contract.items())
                    assert digest(scope['text']) == contract['body_sha256']
                    assert digest(compact(scope['translator_notes'])) == contract['notes_sha256']
                    assert scope['translator_notes'] == []
                else:
                    assert not scope
            assert len(data.get('publisher_divisions', [])) == len(row.get('publisher_divisions', []))
            for scope, contract in zip(data.get('publisher_divisions', []), row.get('publisher_divisions', []), strict=True):
                assert all(scope[k] == v for k, v in contract.items())
                assert digest(scope['text']) == contract['body_sha256'] and scope['translator_notes'] == []
            assert not any('audio' in key.lower() or key.lower() in ('front_matter', 'media', 'recording') for key in data)
        try:
            # Bounded startup readiness only; all reader navigation uses exact responses and DOM guards.
            for _ in range(100):
                try:
                    urllib.request.urlopen(base + '/healthz', timeout=1).close()
                    break
                except OSError:
                    time.sleep(.1)
            else:
                raise AssertionError('Actual packaged HTTP bundle did not start')
            metadata = {uid: tool('get_text', {'uid': uid, 'limit': 200}) for uid in rows}
            assert not ledger.exists(), 'Pāli metadata fetched English'
            for uid, meta in metadata.items():
                if uid in BASELINE_ROOT_SEGMENTS:
                    assert digest(compact([{k: seg[k] for k in ('ref', 'type', 'text')} for seg in meta['segments']])) == BASELINE_ROOT_SEGMENTS[uid]
                if uid in BASELINE_ROOT_RECEIPTS:
                    assert [{**{k: s[k] for k in ('ref', 'type')}, 'text_sha256': digest(s['text'])} for s in meta['segments']] == BASELINE_ROOT_RECEIPTS[uid]
                choice = meta['english_available']
                assert len(choice) == 1 and choice[0]['translation_id'] == version(uid)
                assert choice[0]['translation_revision'] == SOURCE_REVISION and choice[0]['url'] == rows[uid]['url']
                if uid in expected and 'segments' in expected[uid]['root']:
                    for segment, golden in zip(meta['segments'], expected[uid]['root']['segments'], strict=True):
                        assert segment['ref'] == golden['ref'] and segment['type'] == golden['type']
                        assert digest(segment['text']) == golden['text_sha256']
            commentary = tool('get_commentary', {'uid': 'tha-ap19', 'limit': 200})
            assert commentary['source']['locator_revision'] == COMMENTARY_REVISION
            assert [s['ref'] for s in commentary['segments']] == ['tha-ap19/c' + str(i) for i in range(1, 8)]
            held = tool('get_text', {'uid': 'tha-ap72', 'limit': 200})
            assert not held['english_available'], 'Held publisher70 source became available'
            for uid in new_ids:
                for request in ({'uid': uid, 'translation': version('thi-ap1')},
                                {'uid': uid, 'translation': version(uid), 'translation_revision': '0' * 40},
                                {'uid': uid, 'translation': version(uid), 'offset': 1, 'prefix_sha256': '0' * 64}):
                    assert rpc('get_translation', request).get('isError')
            assert not ledger.exists(), 'Unsafe source identity fetched bytes'
            whole, first_pages, widgets = {}, {}, {}
            for uid in new_ids:
                request = {'uid': uid, 'translation': version(uid), 'translation_revision': SOURCE_REVISION, 'limit': 500}
                pieces, initial = [], None
                while request:
                    data = tool('get_translation', request)
                    source(data, uid)
                    initial = initial or data
                    assert data['offset'] == len(''.join(pieces)) and len(pieces) < 150
                    pieces.append(data['text'])
                    request = data['continue_with']['arguments'] if data['continue_with'] else None
                    if request:
                        assert request['uid'] == uid and request['translation'] == version(uid)
                        assert request['translation_revision'] == SOURCE_REVISION and request['prefix_sha256'] == digest(''.join(pieces))
                        assert rpc('get_translation', {**request, 'prefix_sha256': '0' * 64}).get('isError')
                first_pages[uid] = initial
                whole[uid] = {**initial, 'text': ''.join(pieces), 'continue_with': None}
                data, golden = whole[uid], expected[uid]
                assert digest(data['text']) == golden['body_sha256']
                paragraphs = data['text'].split('\n\n')
                assert [digest(p) for p in paragraphs] == [p['sha256'] for p in golden['body_paragraphs']]
                assert [len(p.splitlines()) for p in paragraphs] == [p['lines'] for p in golden['body_paragraphs']]
                for paragraph, stanza in zip(paragraphs[1:-2], golden['stanza_layout'], strict=True):
                    assert re.sub(r'\[Note \d+\]', '', paragraph).strip().endswith(stanza['suffix'])
                    assert len(paragraph.splitlines()) == stanza['lines']
                widget = tool('read_passage_widget', {'uid': uid, 'translation': version(uid), 'english_translation_revision': SOURCE_REVISION})
                widgets[uid] = widget
                assert widget['english'], 'Embedded bridge refused actual approved source'
                source({**widget['english'], 'text_id': widget['text_id']}, uid)
                receipts.append({'uid': uid, 'publisher_poem': golden['poem'], 'paragraphs': len(paragraphs),
                    'stanza_entries': len(golden['stanza_layout']), 'notes': golden['note_count'], 'pages': len(pieces), **{k: rows[uid][k] for k in PINS}})
            checks.append({'check': 'Historical89 explicit choices; old70 profiles/links/Pāli exact; current intake exact and held publisher70 absent; all19 exact body paragraphs, printed entries, per-note hashes, apparatus, revisions and bounded continuations; actual widget tool payloads'})
            comparison_probe = """import assert from 'node:assert/strict';
              import {validateComparisonPage,comparisonChoices} from './web/translation-comparison.mjs';
              let input='';for await(const chunk of process.stdin)input+=chunk;const p=JSON.parse(input);
              for(const [uid,data] of Object.entries(p.first)){
                const choices=p.metadata[uid].english_available,args={uid,translation:data.translation_id,translation_revision:data.translation_revision,limit:data.limit};
                assert.equal(comparisonChoices(choices,uid).length,1);
                validateComparisonPage(data,args,{uid,choices,accepted:null});
              }
              for(const [uid,label,patch] of p.patches){
                const data=p.first[uid],choices=p.metadata[uid].english_available,args={uid,translation:data.translation_id,translation_revision:data.translation_revision,limit:data.limit};
                assert.throws(()=>validateComparisonPage({...data,...patch},args,{uid,choices,accepted:null}),label);
              }
              process.stdout.write(JSON.stringify({actual_sources:Object.keys(p.first).length,refusals:p.patches.length}));"""
            comparison_run = subprocess.run(['node', '--input-type=module', '-e', comparison_probe], cwd=ROOT,
                input=compact({'first': first_pages, 'metadata': metadata, 'patches': tamper_patches(whole)}),
                text=True, capture_output=True)
            assert comparison_run.returncode == 0, 'Actual-response comparison validator probe failed'
            checks.append({'check': 'Actual response comparison-policy acceptance and strict tamper refusal; ordinary UI unavailable with only one reviewed source', **json.loads(comparison_run.stdout)})
            resources = protocol('resources/list', {})['resources']
            widget_uri = next(item['uri'] for item in resources if item['uri'].startswith('ui://pali-canon/reader-') and item['uri'].endswith('.html') and 'skybridge' not in item['uri'])
            widget_html = protocol('resources/read', {'uri': widget_uri})['contents'][0]['text']
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            context.add_init_script("""window.addEventListener('hashchange',event=>{const s=window.expansionGate;
                              if(!s||s.held||s.released)return;const h=new URL(event.newURL).hash;
                              if(h.startsWith('#read?')&&new URLSearchParams(h.slice(6)).get('uid')===s.uid){s.held={oldURL:event.oldURL,newURL:event.newURL};event.stopImmediatePropagation()}},true)""")
                            old = [{'uid': 'thi-ap31', 'title': 'Preserved Therī note', 'ref': 'thi-ap31/2', 'offset': 1, 'source_commit': manifest['vri_commit'], 'note': PRIVATE + ' saved'},
                                   {'uid': 'tha-ap19', 'title': 'Preserved Therā note', 'ref': 'tha-ap19/2', 'offset': 1, 'source_commit': manifest['vri_commit'] + '-apadana-thera11-30-v1', 'note': PRIVATE + ' saved'},
                                   {'uid': 'commentary-ref:tha-ap19', 'title': 'Preserved commentary note', 'ref': 'tha-ap19/c2', 'offset': 1, 'source_commit': COMMENTARY_REVISION, 'note': PRIVATE + ' saved'}]
                            raw = compact({'theme': theme, 'remember_position': False, 'saved': old, 'reading_progress': []})
                            context.add_init_script(f'if(!localStorage.getItem({json.dumps(KEY)}))localStorage.setItem({json.dumps(KEY)},{json.dumps(raw)})')
                            page, errors, forbidden, requests = context.new_page(), [], [], []
                            page.set_default_timeout(15000)
                            state = {'drift': None}
                            page.on('pageerror', lambda error: errors.append(type(error).__name__))
                            def intercept(route):
                                req = route.request
                                if not req.url.startswith(base + '/') or PRIVATE_MARKER in req.url or PRIVATE_MARKER in (req.post_data or '') or any(PRIVATE_MARKER in v for v in req.headers.values()):
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
                                assert not errors and not forbidden
                                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                                assert PRIVATE_MARKER not in page.title()
                                assert profile(page)['saved'][:len(old)] == old
                                if args.a11y:
                                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                                    result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                                    scans.append({'width': width, 'theme': theme, 'state': label, 'violations': [v['id'] for v in result['violations']]})
                            def choose(uid):
                                prior = len(requests)
                                read_tool(page, 'English sources').click()
                                card = page.locator('#study .translation-choice').filter(has_text=rows[uid]['reference'])
                                expect(card).to_have_count(1)
                                assert len(requests) == prior
                                expect(page.get_by_role('button', name='Compare selected sources', exact=True)).to_have_count(0)
                                card.get_by_role('button').filter(has_text='Read source ·').focus()
                                page.keyboard.press('Enter')
                            saved(page, base)
                            page.get_by_label('Your personal note', exact=True).first.fill(PRIVATE + ' unsaved')
                            navigation_proofs = []
                            for family_uid, family in (('thi-ap40', current_family_ids(ROOT, 'chapter-4')), ('tha-ap43', current_family_ids(ROOT, 'chapter-3'))):
                                prior = len(requests)
                                page.goto(base + '/#read?uid=' + family_uid)
                                expect(page.locator('.segment-label a').first).to_have_text(family_uid + '/1')
                                loaded(page)
                                read_tool(page, 'English sources')
                                navigation = page.get_by_role('region', name='Reviewed publisher edition navigation', exact=True, include_hidden=True)
                                navigation.get_by_text('Reviewed publisher edition order', exact=True).click()
                                selector = navigation.get_by_role('combobox', name='Poem in this reviewed publisher edition', exact=True)
                                assert selector.locator('option').evaluate_all('items=>items.map(item=>item.value)') == family
                                assert set(family) <= set(combined_rows) and 'tha-ap72' not in family
                                assert len(requests) == prior
                                if family_uid.startswith('tha'):
                                    for origin_uid, summary_uid in (('tha-ap43', 'tha-ap52'), ('tha-ap53', 'tha-ap62')):
                                        if origin_uid != family_uid:
                                            page.goto(base + '/#read?uid=' + origin_uid)
                                            expect(page.locator('.segment-label a').first).to_have_text(origin_uid + '/1')
                                            loaded(page)
                                            read_tool(page, 'English sources')
                                            navigation = page.get_by_role('region', name='Reviewed publisher edition navigation', exact=True, include_hidden=True)
                                            navigation.get_by_text('Reviewed publisher edition order', exact=True).click()
                                        link = navigation.get_by_role('link', name='Chapter summary source · publisher poem ' + str(rows[summary_uid]['poem']), exact=True)
                                        navigation_proofs.append(open_summary(page, link, summary_uid, origin_uid, controlled=theme == 'dark'))
                                        assert len(requests) == prior
                                        page.goto(base + '/#read?uid=' + family_uid)
                                        expect(page.locator('.segment-label a').first).to_have_text(family_uid + '/1')
                                        loaded(page)
                                        read_tool(page, 'English sources')
                                        navigation = page.get_by_role('region', name='Reviewed publisher edition navigation', exact=True, include_hidden=True)
                                        navigation.get_by_text('Reviewed publisher edition order', exact=True).click()
                                audit('reviewed family navigation ' + family_uid)
                            for uid in new_ids:
                                prior = len(requests)
                                page.goto(base + '/#read?uid=' + uid)
                                expect(page.locator('.segment-label a').first).to_have_text(uid + '/1')
                                loaded(page)
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
                                    assert all(v in provenance.text_content() for v in (SOURCE_REVISION, 'CC BY-NC-SA 4.0', 'Walters', 'Whitman College'))
                                    assert set(provenance.locator('a').evaluate_all('links=>links.map(link=>link.href)')) == {rows[uid]['url'], LICENSE_URL}
                                    notes = page.get_by_role('region', name='Translator’s notes', exact=True)
                                    if expected[uid]['note_numbers']:
                                        expect(notes).to_have_count(1)
                                        actual_notes = [{'number': int(item.get_attribute('value')), 'text': item.locator('p').text_content()} for item in notes.locator('li').all()]
                                        assert digest(compact(actual_notes)) == rows[uid]['notes_sha256']
                                    else:
                                        expect(notes).to_have_count(0)
                                    preface = page.get_by_role('heading', name='Publisher preface · editorial, not poem text', exact=True)
                                    assert preface.count() == int(bool(whole[uid]['publisher_paratext']))
                                    if preface.count():
                                        assert digest(preface.locator('..').locator('.translation').text_content()) == rows[uid]['paratext_sha256']
                                    expect(page.get_by_role('heading', name='Preface notes · editorial, not poem notes', exact=True)).to_have_count(0)
                                    summary = page.get_by_role('region', name='Canonical chapter summary · not poem text', exact=True)
                                    if rows[uid].get('chapter_summary'):
                                        expect(summary).to_have_count(1)
                                        assert digest(summary.locator('.translation').text_content()) == rows[uid]['chapter_summary']['body_sha256']
                                        assert summary.locator('li').count() == 0
                                    else:
                                        expect(summary).to_have_count(0)
                                    divisions = page.get_by_role('region', name='Publisher recitation division · not poem text', exact=True)
                                    assert divisions.count() == len(rows[uid].get('publisher_divisions', []))
                                    for division, contract in zip(divisions.all(), rows[uid].get('publisher_divisions', []), strict=True):
                                        assert digest(division.locator('.translation').text_content()) == contract['body_sha256']
                                        assert division.locator('li').count() == 0
                                    assert page.locator('#study audio,#study video,#study iframe,#study source').count() == 0
                                    audit(uid + ' page ' + str(part_count))
                                    next_page = page.get_by_role('button', name='Next English page →', exact=True)
                                    if not next_page.count():
                                        break
                                    last = body.text_content()
                                    next_page.focus()
                                    page.keyboard.press('Enter')
                                    expect(body).not_to_have_text(last)
                                assert digest(''.join(combined)) == rows[uid]['body_sha256']
                                assert requests[-1]['uid'] == uid and requests[-1]['translation_revision'] == SOURCE_REVISION
                            patches = tamper_patches(whole)
                            for uid, label, patch in patches:
                                page.goto(base + '/#read?uid=' + uid)
                                expect(page.locator('.segment-label a').first).to_have_text(uid + '/1')
                                state['drift'] = patch
                                choose(uid)
                                expect(page.get_by_role('button', name='Retry selected source', exact=True)).to_be_visible()
                                expect(page.locator('#study .translation')).to_have_count(0)
                                assert page.locator('.passage').first.inner_text() == metadata[uid]['segments'][0]['text']
                                audit('refused ' + label)
                            state['drift'] = None
                            for item in old:
                                saved(page, base)
                                bookmark_link(page, item).focus()
                                page.keyboard.press('Enter')
                                expect(page.locator('.segment-label a').first).to_have_text(item['ref'])
                                loaded(page)
                                assert page.locator('.passage').first.inner_text() == (commentary if item['uid'].startswith('commentary-ref:') else metadata[item['uid']])['segments'][item['offset']]['text']
                            saved(page, base)
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            page.reload()
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            with page.expect_download() as download:
                                page.get_by_role('button', name='Export bookmarks and notes', exact=True).click()
                            exported = json.loads(Path(download.value.path()).read_text())
                            assert exported['saved'] == [{**old[0], 'note': PRIVATE + ' unsaved'}, *old[1:]]
                            assert profile(page)['saved'] == old
                            audit('private draft recovery and export')
                            for fresh_uid in ('tha-ap43', 'tha-ap62'):
                                page.goto(base + '/#read?uid=' + fresh_uid)
                                expect(page.locator('.segment-label a').first).to_have_text(fresh_uid + '/1')
                                segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                                segment.get_by_role('button', name='Save passage ' + fresh_uid + '/2', exact=True).click()
                                fresh = profile(page)['saved'][-1]
                                assert fresh['ref'] == fresh_uid + '/2' and fresh['offset'] == 1
                                assert fresh['source_commit'] == metadata[fresh_uid]['source'].get('locator_revision', manifest['vri_commit'])
                                saved(page, base)
                                bookmark_link(page, fresh).focus()
                                page.keyboard.press('Enter')
                                expect(page.locator('.segment-label a').first).to_have_text(fresh['ref'])
                                loaded(page)
                                assert page.locator('.passage').first.inner_text() == metadata[fresh_uid]['segments'][1]['text']
                                audit('fresh bookmark roundtrip ' + fresh_uid)
                            checks.append({'width': width, 'theme': theme, 'navigation_timing': navigation_proofs,
                                'check': 'All19 actual selected sources; complete poem/notes/apparatus;20 strict cached-response refusals preserve Pāli;current independently reviewed family navigation with held publisher70 absent;private drafts/reload/export;existing exact bookmarks;single-source comparison refusal'})
                            context.close()
                            check_widgets(browser, widget_html, widgets, tamper_patches(whole), width, theme, checks)
                    browser.close()
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(event['ok'] for event in events)
            assert {event['url'] for event in events} == {rows[uid]['raw_url'] for uid in new_ids}
            report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'source_artifacts': artifacts,
                'publisher_revision': SOURCE_REVISION, 'source_review_goldens_sha256': GOLDEN_PINS,
                'harness_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'server_file_sha256': {'server/' + str(p.relative_to(server_dir)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(server_dir.rglob('*')) if p.is_file()},
                'previous_metadata_baseline': 'a154013eded45f6ee319fff5cc246ed563811c55', 'previous_profiles_links_pali_preserved': 70,
                'outside_source_tree': bool(args.server_dir), 'browser_mode': 'not run' if args.mcp_only else 'chromium',
                'csp_bypass': 'test-only axe contexts' if args.a11y else 'none', 'pinned_provider_reads': len(events), 'upstream_provider_requests': 0,
                'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
                'limits': 'Actual packaged MCP and emulated Chromium viewports with exact locally pinned official publisher bytes at provider transport. Complete publisher-edition poems, not line-complete VRI translations. Widget host bridges are simulated; no signed-in ChatGPT host acceptance is claimed. No live publisher availability, new rights/specialist approval, physical-device or human assistive acceptance. Reports metadata/hashes only; publisher bodies, notes and private drafts excluded.'}
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
        frames = [frame for frame in traceback.extract_tb(error.__traceback__) if frame.filename == __file__]
        frame = frames[-1] if frames else None
        trace, context = error.__traceback__, {}
        while trace:
            if trace.tb_frame.f_code.co_filename == __file__:
                scope = trace.tb_frame.f_locals
                if re.fullmatch(r'(?:thi|tha)-ap\d+', str(scope.get('uid', ''))): context['uid'] = scope['uid']
                if isinstance(scope.get('label'), str) and re.fullmatch(r'[A-Za-z0-9 -]{1,60}', scope['label']): context['check_label'] = scope['label']
            trace = trace.tb_next
        print(json.dumps({'passed': False, 'error_type': type(error).__name__,
            'failure_at': {'file': Path(__file__).name, 'line': frame.lineno if frame else None}, 'context': context,
            'limits': 'Failure details redacted to protect publisher wording, notes and private drafts.'}), file=sys.stderr)
        sys.exit(1)
