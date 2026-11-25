/**
 * 遊戲靜態常數：Gemini 端點、新手教學卡片、山城書院角色定義、AI 策略劇本、8 位書院夥伴人設與三好詞典
 */
"use strict";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// v21.3 Independent 6-Chapter Device Manuals (Phone / Tablet / Desktop — zero emojis, readable >= 13.5px)
const DEVICE_TUTORIAL_META = {
  phone: {
    key: "phone",
    label: "手機教學",
    shortTitle: "手機單手觸控指南",
    banner: "專為手機直握與單手操作設計：橫滑座位條選座、長按開輪盤、一鍵點牌免打字。"
  },
  tablet: {
    key: "tablet",
    label: "平板教學",
    shortTitle: "平板雙手觸控指南",
    banner: "專為平板直／橫雙握設計：左手掌指南與表態、右手控四給與推進、頭像拖線直覺投票。"
  },
  desktop: {
    key: "desktop",
    label: "電腦教學",
    shortTitle: "電腦鍵鼠與熱鍵指南",
    banner: "專為電腦寬螢幕鍵鼠設計：拖曳頭像連線、滾輪自由運鏡、全套單鍵快捷鍵流暢操作。"
  }
};

const _TUT_ROLES_SHARED_HTML =
  '<div class="text-[13.5px] font-bold text-emerald-300">基礎四職（6 人局配置）</div>' +
  '<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">' +
  '<div class="tut-role-item"><span class="tut-role-badge text-amber-300">明心觀察員</span><span>每晚查驗 1 人是否為酸民狼，天亮後向全場說明線索。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-emerald-300">滴水奉茶師</span><span>手握<strong>「暖心回甘茶」</strong>救人與<strong>「清心醒神茶」</strong>請離，各限一次。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-slate-200">三好書院生</span><span>無夜間主動技，憑傾聽發言、比對票型找出說謊者。</span></div>' +
  '<div class="tut-role-item tut-role-wolf"><span class="tut-role-badge text-rose-300">鍵盤酸民狼</span><span>入夜與同伴鎖定目標令其離席，白天偽裝清白帶動風向。</span></div>' +
  '</div>' +
  '<div class="text-[13.5px] font-bold text-sky-300 pt-0.5">進階四職（8～12 人局配置）</div>' +
  '<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">' +
  '<div class="tut-role-item"><span class="tut-role-badge text-sky-300">直心糾察長</span><span>離席時可帶走 1 人一同退席（遭清心茶請離時除外）。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-cyan-300">護心守衛</span><span>每晚守護 1 人擋下夜襲（不可連兩晚守同一人，同守同救會破盾）。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-teal-300">清心長老 (10/12人)</span><span>首次遭公投誤投時亮牌免於離席，之後失去投票權仍可發言帶隊。</span></div>' +
  '<div class="tut-role-item tut-role-wolf"><span class="tut-role-badge text-rose-200">流言首領 (10/12人)</span><span>白天遭公投離席時，可反手拉走 1 位在席好人。</span></div>' +
  '</div>';

const _TUT_FOURG_SHARED_HTML =
  '<div class="tut-card tut-tone-good space-y-1.5">' +
  '<div class="tut-card-title text-emerald-300">三好蓮花（左下角三瓣修為・集滿解鎖加權）</div>' +
  '<div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">' +
  '<div class="tut-step-pill"><strong class="text-amber-300">存好心</strong><div class="opacity-85">查證線索、抓出前後矛盾</div></div>' +
  '<div class="tut-step-pill"><strong class="text-emerald-300">說好話</strong><div class="opacity-85">語氣溫潤、以理服人化解對立</div></div>' +
  '<div class="tut-step-pill"><strong class="text-sky-300">做好事</strong><div class="opacity-85">奉茶結緣、守護同席夥伴</div></div>' +
  '</div>' +
  '<div class="pt-0.5">集滿三瓣：好人於公投獲得<strong>「黃金善意票（+1 票）」</strong>；酸民狼則可降低席間戒心。</div>' +
  '</div>' +
  '<div class="tut-card tut-tone-gold space-y-1.5">' +
  '<div class="tut-card-title text-amber-300">四給奉茶茶禮（每張全場限用一次）</div>' +
  '<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">' +
  '<div><strong>給信心：</strong>替選定夥伴隱密擋下 1 票</div>' +
  '<div><strong>給歡喜：</strong>破冰觀察 2 位神色緊繃的茶友</div>' +
  '<div><strong>給希望：</strong>點名 2 席展開 15 秒明燈雙向對質，比對言票矛盾與狼坑（絕不洩漏底牌）</div>' +
  '<div><strong>給方便：</strong>展開關係脈絡並溫言號召歸票</div>' +
  '</div>' +
  '</div>';

const DEVICE_TUTORIAL_DECKS = {
  phone: [
    {
      icon: "01",
      tab: "基本規則",
      title: "手機直握：三階段一眼掌握",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-tip-bar">手機版將畫面分為<strong>上方 3D 茶席</strong>與<strong>下方單手操控區</strong>，全程免打字、免演戲，用大拇指點選就能流暢完成整局推理。</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">好人陣營（多數・互不知底牌）</div><div class="tut-card-body">聽發言、看票型找破綻，<strong>將所有酸民狼公投請離</strong>即勝。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">酸民狼陣營（少數・夜間相識）</div><div class="tut-card-body">入夜暗中令 1 位好人離席，白天偽裝清白；<strong>令神職或書院生全數離席</strong>即勝。</div></div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">每一輪依序推進三個階段：</div>' +
        '<div class="grid grid-cols-3 gap-1.5 text-center">' +
        '<div class="tut-step-pill"><div class="font-bold text-indigo-300">壹 · 入夜</div><div class="font-bold mt-0.5">暗中行動</div><div class="opacity-80">點選底部座位條<br />施展夜間職能</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-amber-300">貳 · 白天</div><div class="font-bold mt-0.5">聽盤陳詞</div><div class="opacity-80">拇指點下一位<br />輪到你點牌發聲</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-rose-300">參 · 公投</div><div class="font-bold mt-0.5">投籌請離</div><div class="opacity-80">鎖定可疑席位<br />最高票者離席</div></div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar">沒玩過狼人殺也能放心玩：畫面中帶有細虛線底線的術語（如 金水、悍跳、警徽流、歸票），輕點即可即時查看白話釋義。</div>' +
        '</div>'
    },
    {
      icon: "02",
      tab: "角色職能",
      title: "手機快速查閱：茶席角色職能",
      html:
        '<div class="space-y-2 text-left">' +
        _TUT_ROLES_SHARED_HTML +
        '<div class="tut-tip-bar">手機對局中點擊左下角<strong>「指南」</strong>會以滿版視窗清楚顯示當前行動步驟；身旁有人時點<strong>「遮蔽」</strong>可一鍵隱藏底牌。</div>' +
        '</div>'
    },
    {
      icon: "03",
      tab: "單手操作",
      title: "手機專屬：單手觸控與長按輪盤",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-demo-rail"><span class="tut-mini-seat">01</span><span class="tut-mini-seat">02</span><span class="tut-mini-seat is-target-seat">03</span><span class="tut-mini-seat">04</span><span class="tut-swipe-thumb"></span></div></div>' +
        '<div class="tut-anim-caption">橫滑座位條 · 拇指輕觸選席</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-hold-center">03<span class="tut-hold-ring"></span><span class="tut-hold-orb is-o1"></span><span class="tut-hold-orb is-o2"></span><span class="tut-hold-orb is-o3"></span><span class="tut-hold-orb is-o4"></span></div></div>' +
        '<div class="tut-anim-caption">長按茶友 0.5 秒 · 綻開偵探輪盤</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral space-y-1.5">' +
        '<div class="tut-card-title text-amber-300">單手大拇指核心操作</div>' +
        '<div>1. <strong>橫滑座位條選座：</strong>拇指輕觸微光席號即可看情資或選目標；連點同一席兩下立即定案防誤觸。</div>' +
        '<div>2. <strong>長按茶友 0.5 秒開偵探輪盤：</strong>白天聽盤長按任一角色，立即綻出圓形輪盤標記好人、存疑、記筆記或觀微。</div>' +
        '<div>3. <strong>微光茶牌一鍵陳詞：</strong>輪到你時直接輕觸三張茶牌即刻發聲，或按語音開口口述。</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">聽盤即時表態</div><div class="tut-card-body">隨心點按<strong>點頭認同</strong>、<strong>皺眉存疑</strong>或<strong>舉杯追問</strong>，微光亮起即按<strong>下一位</strong>推進。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">身為酸民狼</div><div class="tut-card-body">夜間屏風三選一下達戰術；白天危急時可選「拂袖掀席」自爆直入黑夜。</div></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "04",
      tab: "三好四給",
      title: "手機底部雙區：三好蓮花與四給奉茶",
      html:
        '<div class="space-y-2 text-left">' +
        _TUT_FOURG_SHARED_HTML +
        '<div class="tut-tip-bar">手機版將<strong>身分牌＋蓮花</strong>置於左下、<strong>「四給奉茶」</strong>折疊置於右下；點擊「四給奉茶」會向上展開 2×2 茶禮盤，點選後自動收合不擋字幕。</div>' +
        '</div>'
    },
    {
      icon: "05",
      tab: "手勢與省電",
      title: "手機運鏡手勢與流暢省電設定",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-pinch-wrap"><span class="tut-pinch-dot is-l"></span><span class="tut-pinch-dot is-r"></span></div></div>' +
        '<div class="tut-anim-caption">雙指開合 · 平滑縮放茶席景深</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-fan-wrap"><span class="tut-fan-slip is-s1">信</span><span class="tut-fan-slip is-s2">喜</span><span class="tut-fan-slip is-s3">望</span><span class="tut-fan-slip is-s4">便</span></div></div>' +
        '<div class="tut-anim-caption">四給奉茶 · 輕點展開、用畢自動收合</div>' +
        '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral space-y-1.5">' +
        '<div class="tut-card-title text-amber-300">手機觸控運鏡手勢</div>' +
        '<div>• <strong>單指滑動空地：</strong>360° 環視山城茶席。</div>' +
        '<div>• <strong>雙指捏合／張開：</strong>平滑縮放鏡頭焦距。</div>' +
        '<div>• <strong>雙擊空地：</strong>立即回正鏡頭視角；<strong>本教學頁</strong>左右滑動可翻章。</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-good space-y-1.5">' +
        '<div class="tut-card-title text-emerald-300">省電與流暢度建議</div>' +
        '<div>• 選單內可切換<strong>運鏡／坐席／俯瞰／2D 圓桌</strong>四種視角。</div>' +
        '<div>• 若手機較舊或電量偏低，開啟<strong>省電流暢</strong>或切至<strong>2D 圓桌</strong>更省電不發燙。</div>' +
        '<div>• 頂部可一鍵調整 AI 語音節奏。</div>' +
        '</div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "06",
      tab: "手機入席",
      title: "手機開局與通勤遊玩建議",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-card tut-tone-good space-y-1.5">' +
        '<div class="tut-card-title text-emerald-300">初次在手機遊玩推薦「新手帶玩席」</div>' +
        '<div>• 預設為節奏明快的<strong> 6 人基礎席（明心觀察員）</strong>，直立螢幕即可一次看清全席動態。</div>' +
        '<div>• 第一輪上方會有簡明導引提示，約 5 分鐘就能跑完一局掌握全部節奏。</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral space-y-1">' +
        '<div class="tut-card-title text-amber-300">通勤靜音也能暢玩</div>' +
        '<div>點右上角<strong>「選單 → 靜音」</strong>即可改為純文字快讀模式，離席後仍可參與<strong>「席外茶靈押注」</strong>與猜狼。</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-gold space-y-1">' +
        '<div class="tut-card-title text-amber-300">免登入・免安裝直接玩</div>' +
        '<div>無需填寫 API 金鑰即可離線對弈；若欲自訂 Gemini 模型，可在右上選單隨時切換。</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar text-center">準備好了嗎？點右下角<strong>「開啟新手帶玩席」</strong>立即單手開局。</div>' +
        '</div>'
    }
  ],

  tablet: [
    {
      icon: "01",
      tab: "基本規則",
      title: "平板劇院：三階段全景推理",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-tip-bar">平板擁有寬闊觸控視野，上方完整呈現<strong>山城 3D 茶席全景</strong>，下方配置雙手觸控區；不必打字，直接點牌或拖線即可投入推理。</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">好人陣營（多數・互不知底牌）</div><div class="tut-card-body">比對各席發言邏輯與投票紀錄，<strong>將所有酸民狼公投請離</strong>即勝。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">酸民狼陣營（少數・夜間相識）</div><div class="tut-card-body">入夜暗中令 1 位好人離席，白天偽裝立場混淆視聽；<strong>令神職或書院生全數離席</strong>即勝。</div></div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">每一輪依序推進三個階段，直到分出勝負：</div>' +
        '<div class="grid grid-cols-3 gap-1.5 text-center">' +
        '<div class="tut-step-pill"><div class="font-bold text-indigo-300">壹 · 入夜</div><div class="font-bold mt-0.5">暗中行動</div><div class="opacity-80">直接點選或拖線<br />施展夜間職能</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-amber-300">貳 · 白天</div><div class="font-bold mt-0.5">輪流陳詞</div><div class="opacity-80">三卡並排一鍵出牌<br />雙手節奏最順暢</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-rose-300">參 · 公投</div><div class="font-bold mt-0.5">投籌請離</div><div class="opacity-80">頭像拖線立即投票<br />最高票者離席</div></div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar">沒玩過狼人殺也能放心玩：介面中帶有細虛線底線的術語（如 金水、悍跳、警徽流、歸票），輕點即可即時查看白話釋義。</div>' +
        '</div>'
    },
    {
      icon: "02",
      tab: "角色職能",
      title: "平板對局：茶席角色職能一覽",
      html:
        '<div class="space-y-2 text-left">' +
        _TUT_ROLES_SHARED_HTML +
        '<div class="tut-tip-bar">點擊左下角<strong>「指南」</strong>會以浮動側卡片顯示職能密令，不遮擋圓桌；與朋友同席共看平板時，可隨時點<strong>「遮蔽」</strong>保護底牌。</div>' +
        '</div>'
    },
    {
      icon: "03",
      tab: "雙手與拖線",
      title: "平板專屬：雙手分區與頭像拖曳連線",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-beam-row"><span class="tut-beam-node">你</span><span class="tut-beam-line"></span><span class="tut-beam-node is-dst">04</span></div></div>' +
        '<div class="tut-anim-caption">頭像拖曳連線 · 放手即落籌或查證</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-twohand-box"><span class="tut-hand-zone">左手 · 指南表態</span><span class="tut-hand-zone is-right">右手 · 推進四給</span></div></div>' +
        '<div class="tut-anim-caption">雙手自然分工 · 零遮擋節奏</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral space-y-1.5">' +
        '<div class="tut-card-title text-amber-300">平板最順手的觸控節奏</div>' +
        '<div>1. <strong>左右雙手自然分工：</strong>左手輕鬆掌控身分指南與表態列，右手順手推進下一位、展四給茶禮與查閱手札。</div>' +
        '<div>2. <strong>頭像拖曳連線即投票／施技：</strong>公投或入夜可直接<strong>按住自己頭像拖線至可疑茶友</strong>，放手即完成投籌或查驗。</div>' +
        '<div>3. <strong>拖線或長按開靜默偵探輪盤：</strong>聽盤時對任一夥伴拖線或長按 0.5 秒，皆可展開輪盤標記與觀微。</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">善用茶席手札</div><div class="tut-card-body">點「手札」以雙欄排坑表檢視全席發言與歷輪票型，大螢幕一眼看清脈絡。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">身為酸民狼</div><div class="tut-card-body">入夜於屏風下達戰術；白天可選「拂袖掀席」自爆切斷警徽流。</div></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "04",
      tab: "三好四給",
      title: "平板策略：三好蓮花與四給奉茶",
      html:
        '<div class="space-y-2 text-left">' +
        _TUT_FOURG_SHARED_HTML +
        '<div class="tut-tip-bar">橫向握持時，<strong>身分與蓮花</strong>常駐左下、<strong>四給奉茶</strong>常駐右下；直向握持時兩者自動對稱排於字幕下方，雙手觸控零遮擋。</div>' +
        '</div>'
    },
    {
      icon: "05",
      tab: "運鏡與橫直",
      title: "平板雙指運鏡・橫直切換與外接鍵盤",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral space-y-1.5">' +
        '<div class="tut-card-title text-amber-300">觸控運鏡與雙擊特寫</div>' +
        '<div>• <strong>單指拖曳空地：</strong>360° 環視茶席；<strong>雙指捏合：</strong>自由縮放。</div>' +
        '<div>• <strong>雙擊任意角色：</strong>推進特寫鏡頭並同步展開情資卡；<strong>雙擊空地：</strong>回正視角。</div>' +
        '<div>• <strong>教學翻頁：</strong>手指左右滑動本區域即可切換章節。</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-good space-y-1.5">' +
        '<div class="tut-card-title text-emerald-300">橫直自適應與外接鍵盤</div>' +
        '<div>• <strong>橫向握持（推薦）：</strong>開啟三欄劇院配置，完整容納 8～12 人大席全景。</div>' +
        '<div>• <strong>直向握持：</strong>自動切換寬幅字幕＋下方雙欄工具，方便沙發上輕鬆閱讀。</div>' +
        '<div>• <strong>支援平板外接鍵盤：</strong>接上鍵盤保護套即可同步使用 <strong>Space</strong> 推進、<strong>J</strong> 手札、<strong>C</strong> 換機位。</div>' +
        '</div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "06",
      tab: "平板入席",
      title: "平板開局與多人共玩建議",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-card tut-tone-good space-y-1.5">' +
        '<div class="tut-card-title text-emerald-300">推薦玩法：新手帶玩席 → 橫向 8～12 人大局</div>' +
        '<div>• 初次體驗可先點右下<strong>「開啟新手帶玩席」</strong>（6 人明心觀察員），快速熟悉三好與四給互動。</div>' +
        '<div>• 熟悉後強烈推薦<strong>橫持平板挑戰 8～12 人局</strong>，同時體驗護心守衛、清心長老與警長歸票制。</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral space-y-1">' +
        '<div class="tut-card-title text-amber-300">課堂／聚會共賞模式</div>' +
        '<div>可開啟「評審導覽」或善用「遮蔽」底牌按鈕，讓多人圍看平板一起討論排坑。</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-gold space-y-1">' +
        '<div class="tut-card-title text-amber-300">離線直開・模型可選</div>' +
        '<div>內建離線深度 AI 引擎免設定即玩；亦可於選單接上 Gemini 金鑰獲得更豐富文風。</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar text-center">準備就緒後，點選右下角<strong>「開啟新手帶玩席」</strong>立即展開茶席推理。</div>' +
        '</div>'
    }
  ],

  desktop: [
    {
      icon: "01",
      tab: "基本規則",
      title: "基本規則",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-tip-bar">每晚有人暗中滋事，天亮後從眾人的話裡找出破綻，<strong>投票請他離席</strong>。不必擅長演戲，也不必打字，搭配滑鼠與單鍵熱鍵即可暢快推理。</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">好人陣營（多數・互不知底牌）</div><div class="tut-card-body">比對眾人的發言與票型找破綻，<strong>將所有酸民狼公投請離</strong>即勝。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">酸民狼陣營（少數・夜間相識）</div><div class="tut-card-body">入夜暗中令 1 位好人離席，白天偽裝清白混淆視聽；<strong>令所有神職或所有書院生離席</strong>即勝。</div></div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">每一輪依序推進三個階段，直到分出勝負：</div>' +
        '<div class="grid grid-cols-3 gap-1.5 text-center">' +
        '<div class="tut-step-pill"><div class="font-bold text-indigo-300">壹 · 入夜</div><div class="font-bold mt-0.5">暗中行動</div><div class="opacity-80">有職能者閉眼施展<br />書院生可燭下覆茶</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-amber-300">貳 · 白天</div><div class="font-bold mt-0.5">輪流陳詞</div><div class="opacity-80">空白鍵順暢聽盤<br />Q/W/E 快速點牌</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-rose-300">參 · 公投</div><div class="font-bold mt-0.5">投籌請離</div><div class="opacity-80">拖曳連線或數字鍵<br />最高票離席・平票決選</div></div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar">沒玩過狼人殺也能放心玩：介面中帶有細虛線底線的術語（如 金水、悍跳、警徽流、歸票），滑鼠移上或點擊即可查看白話釋義。</div>' +
        '</div>'
    },
    {
      icon: "02",
      tab: "角色職能",
      title: "茶席全 8 角色職能一覽",
      html:
        '<div class="space-y-2 text-left">' +
        _TUT_ROLES_SHARED_HTML +
        '<div class="tut-tip-bar">對局中隨時點擊左下角<strong>「指南」</strong>查看職能密令；大螢幕投影或旁有人觀看時，點擊<strong>「遮蔽」</strong>即可隱藏身分牌。</div>' +
        '</div>'
    },
    {
      icon: "03",
      tab: "滑鼠互動",
      title: "電腦滑鼠操作、拖曳連線與 3D 彩蛋",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-beam-row"><span class="tut-beam-node">你</span><span class="tut-beam-line"></span><span class="tut-beam-node is-dst">04</span></div></div>' +
        '<div class="tut-anim-caption">拖曳頭像連線 · 一筆完成落籌或查證</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-fan-wrap"><span class="tut-fan-slip is-s1">信</span><span class="tut-fan-slip is-s2">喜</span><span class="tut-fan-slip is-s3">望</span><span class="tut-fan-slip is-s4">便</span></div></div>' +
        '<div class="tut-anim-caption">懸停展開四給奉茶 · 隨選隨施</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral space-y-1.5">' +
        '<div class="tut-card-title text-amber-300">滑鼠核心互動方式</div>' +
        '<div>1. <strong>左鍵點選與連點確認：</strong>點擊茶友或微光座位條檢視情資；入夜或公投時連點同一席兩下即刻定案。</div>' +
        '<div>2. <strong>左鍵拖曳頭像連線：</strong>從自己頭像拖線至目標放開，立即投票、查驗或守護；聽盤拖線至他席展開<strong>靜默偵探輪盤</strong>。</div>' +
        '<div>3. <strong>雙擊特寫與茶席彩蛋：</strong>雙擊角色推進特寫；點擊<strong>桌心蓮花、燭火、主持清茗或龜山島</strong>皆有互動回應。</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">身為好人</div><div class="tut-card-body">善用 <kbd class="ui-kbd">J</kbd> 開啟茶席手札對照歷輪票型與矛盾，並自由排坑。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">身為酸民狼</div><div class="tut-card-body">入夜於屏風指揮狼隊戰術；白天必要時可「拂袖掀席」自爆直入黑夜。</div></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "04",
      tab: "三好四給",
      title: "三好蓮花與四給奉茶戰術",
      html:
        '<div class="space-y-2 text-left">' +
        _TUT_FOURG_SHARED_HTML +
        '</div>'
    },
    {
      icon: "05",
      tab: "熱鍵與運鏡",
      title: "電腦完整鍵盤熱鍵與四種 3D 機位",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-anim-card" aria-hidden="true">' +
        '<div class="tut-anim-canvas"><div class="tut-key-row"><span class="tut-anim-key">Space</span><span class="tut-anim-key">Q / W / E</span><span class="tut-anim-key">Enter</span><span class="tut-anim-key">J</span><span class="tut-anim-key">C</span></div></div>' +
        '<div class="tut-anim-caption">單鍵節奏 · 聽盤、出牌、落籌、手札、換鏡流暢銜接</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral space-y-1.5">' +
        '<div class="tut-card-title text-amber-300">滑鼠運鏡與四種機位</div>' +
        '<div>• <strong>拖曳空地</strong> 360° 環視山城，<strong>滑鼠滾輪</strong>縮放焦距，<strong>雙擊空地</strong>或按 <kbd class="ui-kbd">R</kbd> 回正鏡頭。</div>' +
        '<div>• 按 <kbd class="ui-kbd">C</kbd> 循環切換<strong>運鏡、坐席、俯瞰、2D 圓桌</strong>；按 <kbd class="ui-kbd">F</kbd> 偷看桌面身分牌。</div>' +
        '<div>• <strong>坐席視角</strong>下可左右拖曳轉頭環顧，宛如親坐茶席。</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral space-y-1.5">' +
        '<div class="tut-card-title text-sky-300">全套鍵盤快捷鍵</div>' +
        '<div class="tut-kbd-grid">' +
        '<span><kbd class="ui-kbd">Space</kbd> 下一位發言</span>' +
        '<span><kbd class="ui-kbd">Enter</kbd> 確認行動</span>' +
        '<span><kbd class="ui-kbd">Q / W / E</kbd> 快捷出牌</span>' +
        '<span><kbd class="ui-kbd">Tab</kbd> 輪換點名目標</span>' +
        '<span><kbd class="ui-kbd">1-0 / - / =</kbd> 選 1–12 號</span>' +
        '<span><kbd class="ui-kbd">J</kbd> 茶席手札</span>' +
        '<span><kbd class="ui-kbd">C / R</kbd> 機位／重置</span>' +
        '<span><kbd class="ui-kbd">P / V / M</kbd> 暫停／語音／靜音</span>' +
        '<span><kbd class="ui-kbd">A</kbd> 自動推進</span>' +
        '<span><kbd class="ui-kbd">Esc</kbd> 關閉／選單</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "06",
      tab: "電腦入席",
      title: "電腦大螢幕開局建議",
      html:
        '<div class="space-y-2 text-left">' +
        '<div class="tut-card tut-tone-good space-y-1.5">' +
        '<div class="tut-card-title text-emerald-300">初次接觸推薦「新手帶玩席」</div>' +
        '<div>• 預設開啟單純的<strong> 6 人基礎席（明心觀察員視角）</strong>，第一輪提供簡明導引，輕鬆上手。</div>' +
        '<div>• 熟悉後可在「自訂茶席」開啟 <strong>10／12 人大局＋警長歸票制＋護心守衛</strong>，體驗高強度多線推理。</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral space-y-1">' +
        '<div class="tut-card-title text-amber-300">提早離席後的觀戰玩法</div>' +
        '<div>離席後可續留觀戰，參與每輪 5 秒<strong>「席外茶靈押注」</strong>與全場猜狼／獵神挑戰。</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-gold space-y-1">' +
        '<div class="tut-card-title text-amber-300">離線、Gemini 與本機 Ollama</div>' +
        '<div>免設定即可直接對弈；電腦端亦可於選單連接個人 Gemini 金鑰或本機 Ollama 模型。</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar text-center">準備就緒後，點選右下角<strong>「開啟新手帶玩席」</strong>立即入座（左右方向鍵亦可翻章）。</div>' +
        '</div>'
    }
  ]
};

// Backwards-compatible default alias (6-chapter deck used by existing callers & smoke tests)
const TUTORIAL_SLIDES = DEVICE_TUTORIAL_DECKS.desktop;

const ROLE_DEFS = {
  seer: {
    key: "seer",
    name: "明心觀察員",
    classicName: "預言家",
    team: "good",
    badgeBg: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    icon: "",
    desc: "存好心查證（預言家位）：每晚靜心查驗 1 位夥伴真實立場！"
  },
  witch: {
    key: "witch",
    name: "滴水奉茶師",
    classicName: "守護位",
    team: "good",
    badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    icon: "",
    desc: "做好事奉茶（守護位）：暖心回甘茶護回 1 次＋清心醒神茶請離 1 次（同夜限一盞，第2夜不可自護）"
  },
  hunter: {
    key: "hunter",
    name: "直心糾察長",
    classicName: "共鳴位",
    team: "good",
    badgeBg: "bg-sky-500/20 text-sky-200 border-sky-400/40",
    icon: "",
    desc: "正氣直心（共鳴位）：被迷霧鎖定或公投離席時可帶走 1 人一同冷靜（遇清心茶、或身為最後一神夜襲屠神時不發動）"
  },
  guard: {
    key: "guard",
    name: "護心守衛",
    classicName: "守衛位",
    team: "good",
    badgeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
    icon: "",
    desc: "護心結界（守衛位）：每晚可守護 1 人擋下迷霧（可自守，不可連守同一人；同守同救會破盾！）"
  },
  villager: {
    key: "villager",
    name: "三好書院生",
    classicName: "好夥伴",
    team: "good",
    badgeBg: "bg-slate-700/70 text-slate-200 border-slate-600",
    icon: "",
    desc: "說好話推理：比對發言與票型，攜手守護山城茶席和諧！"
  },
  elder: {
    key: "elder",
    name: "清心長老",
    classicName: "豁免長老",
    team: "good",
    badgeBg: "bg-teal-500/20 text-teal-200 border-teal-400/40",
    icon: "",
    desc: "10/12 人進階好人：首次被白天公投誤投時，亮牌免於離席（之後失去投票權，但保留發言權帶隊）！"
  },
  wolf: {
    key: "wolf",
    name: "鍵盤酸民狼",
    classicName: "酸民狼",
    team: "wolf",
    badgeBg: "bg-rose-500/20 text-rose-200 border-rose-400/40",
    icon: "",
    desc: "晚上散播迷霧請人暫離，白天偽裝熱心同學偷放酸言帶風向！"
  },
  wolf_king: {
    key: "wolf_king",
    name: "流言首領",
    classicName: "狼王",
    team: "wolf",
    badgeBg: "bg-red-600/25 text-rose-200 border-rose-400/50",
    icon: "",
    desc: "10/12 人進階酸民狼：被白天公投請離茶席時，可發動「最後帶風向」拉走 1 位在席夥伴！"
  }
};

// ==================== V8.0 PER-ROLE PLAYBOOK & THREE-GOODNESS QUOTES ====================
const ROLE_GUIDES = {
  seer: {
    icon: "",
    iconKey: "seer",
    themeClass: "role-theme-seer",
    shortRole: "神職・查驗核心",
    cardOneLiner: "每晚可偷看 1 個人是不是酸民狼",
    cardNight: "點選 1 位夥伴查驗，得知他是好人或酸民狼",
    cardDay: "輪到你發言時，分享查證結果引導共識",
    cardVote: "帶領夥伴公投請離所有酸民狼即獲勝",
    winCond: "與好夥伴協力公投請出所有酸民狼",
    nightAction: "每晚可靜心查證 1 位存活夥伴，立刻得知對方是好人或酸民狼。",
    dayAction: "善用查驗紀錄本，決定「亮牌報查驗＋預告今晚查誰」，若遇假觀察員對跳請果斷拆穿並對齊全場好人坑。",
    threeGoodTip: "存好心公開真實查證、溫和號召歸票，最快點亮三好蓮花取得「黃金善意票 +1」！"
  },
  witch: {
    icon: "",
    iconKey: "witch",
    themeClass: "role-theme-witch",
    shortRole: "神職・雙茶救贖",
    cardOneLiner: "手握「暖心護回」與「清心請離」雙茶的好人",
    cardNight: "決定是否以暖心茶救人，或以清心茶請離可疑者",
    cardDay: "先靜聽眾人發言，關鍵時刻亮牌替銀水作證",
    cardVote: "配合好夥伴把說謊的酸民狼請離即獲勝",
    winCond: "守住關鍵神職與好人輪次，公投出全部酸民狼",
    nightAction: "手持 1 盞「暖心回甘茶」（得知遭迷霧鎖定者並護回，第2夜不可自護）與 1 盞「清心醒神茶」（請可疑者離席），同夜限用一盞。",
    dayAction: "前期可先低調聽發言防狼刀；當你護回的銀水夥伴被冤枉或局勢需要定錨時，一鍵亮奉茶師作證！",
    threeGoodTip: "用暖心回甘茶護回夥伴或白天奉暖茶給好人，立刻累積「做好事」瓣並穩定全場信任！"
  },
  hunter: {
    icon: "",
    iconKey: "scales",
    themeClass: "role-theme-hunter",
    shortRole: "神職・正氣威懾",
    cardOneLiner: "離席瞬間可以拉 1 個人一同退席的正氣好人",
    cardNight: "夜間安心靜息，不需發動主動技能",
    cardDay: "細聽眾人言行，把最像酸民狼的人記在心裡",
    cardVote: "公投抓狼；若遭淘汰記得帶走最可疑者",
    winCond: "穩住好人陣線，離席瞬間以正氣共鳴精準帶走酸民狼",
    nightAction: "夜間安心靜息（無主動夜技），但白天務必用心記住最可疑的發言矛盾。",
    dayAction: "平時低調盤清好人坑與狼坑；若被酸民狼推上投票台，可一鍵「亮糾察長威懾」，被投或遭迷霧請離（非清心茶且非最後一神）即可開槍帶走 1 人！",
    threeGoodTip: "理性聽盤不急躁貼標籤，靠「說好話」贏得全場好人信賴，危急時刻一擊翻盤！"
  },
  guard: {
    icon: "",
    iconKey: "guard",
    themeClass: "role-theme-guard",
    shortRole: "神職・結界守護",
    cardOneLiner: "每晚替 1 位夥伴展開護心結界擋下迷霧",
    cardNight: "選擇 1 席守護（可守自己、不可連兩晚守同人）",
    cardDay: "低調聽盤，暗中守護你判斷為真神職的夥伴",
    cardVote: "攜手好人陣營公投請離所有酸民狼即勝",
    winCond: "保護關鍵神職避開迷霧，拉開好人輪次優勢",
    nightAction: "每晚可為 1 位夥伴（含自己）展開護心結界擋下迷霧；不可連續兩晚守同一人，且「同守同救」會破盾！",
    dayAction: "建議低調隱藏身分，留意奉茶師是否已交回甘茶以避免撞盾；必要時再一鍵公開守衛路線自證清白。",
    threeGoodTip: "默默守護他人正是最高境界的「做好事」，搭配四給【給信心】更能雙重守護核心夥伴！"
  },
  elder: {
    icon: "",
    iconKey: "elder",
    themeClass: "role-theme-elder",
    shortRole: "進階好人・豁免定海針",
    cardOneLiner: "首次被誤投時亮牌豁免離席的穩健長者",
    cardNight: "夜間安心靜息，不需發動主動技能",
    cardDay: "理性替誠懇夥伴發聲，為神職分擔壓力",
    cardVote: "觸發豁免後雖無投票權，仍可發言帶領歸票",
    winCond: "善用首次免離席護盾替神職分擔火力，協助好人穩健抓狼",
    nightAction: "夜間安心靜息，白天專注交叉比對票型與立場矛盾。",
    dayAction: "首次被白天公投誤投時會自動亮牌免離席（之後失去投票權，但保留發言權持續帶隊！），可放心多點好人坑替真神職扛推。",
    threeGoodTip: "以長者風範說好話化解對立、善用四給錦囊團結好人，就算失票仍能靠發言定乾坤！"
  },
  villager: {
    icon: "",
    iconKey: "villager",
    themeClass: "role-theme-villager",
    shortRole: "好人陣營・三好偵探",
    cardOneLiner: "憑聽覺與邏輯識破謊言的三好偵探",
    cardNight: "夜間安心靜息，待天亮細聽全場發言",
    cardDay: "誠懇者按「認同」、有異者按「存疑」並蒐證",
    cardVote: "與好夥伴攜手請離所有酸民狼即獲勝",
    winCond: "用雪亮雙眼盤出多位好人坑，把所有酸民狼公投請離",
    nightAction: "夜間靜心休養，天亮後從頭像微表情、發言矛盾與票型著手推理。",
    dayAction: "你的好人坑沒有人數上限！盡情標記所有可信的好人夥伴，逐步壓縮酸民狼藏身空間，並善用觀微、奉暖茶與四給卡片主導節奏。",
    threeGoodTip: "三好書院生最能發揮三好精神：存好心找證據、說好話化解酸言、做好事奉暖茶，覺醒「黃金善意票 +1」關鍵一票定勝負！"
  },
  wolf: {
    icon: "",
    iconKey: "wolf",
    themeClass: "role-theme-wolf",
    shortRole: "酸民狼陣營・暗中佈局",
    cardOneLiner: "暗中請離好人、白天偽裝帶風向的酸民狼",
    cardNight: "避開狼同伴，鎖定 1 位好人令其今夜暫離",
    cardDay: "偽裝成理性好人轉移焦點，切勿出賣同伴",
    cardVote: "配合同伴歸票淘汰好人，達屠邊條件即勝",
    winCond: "讓所有神職或所有好夥伴離席（達屠邊條件）即獲勝",
    nightAction: "避開狼隊同伴，鎖定 1 位好人散播迷霧；並可透過戰術列指揮 AI 同伴明日悍跳、深水倒鉤或聯手集火。",
    dayAction: "你已知道全部狼同伴，不需要點狼坑！改用「狼人佈局板」挑選甩鍋對象、假保好人拉票，並用「獵神筆記」偷偷標記神職供夜晚精準鎖定。",
    threeGoodTip: "反派也能修演技：保持溫和禮貌、適時打四給卡，點亮三好偽裝光環可大幅降低全場好人對你的懷疑度！"
  },
  wolf_king: {
    icon: "",
    iconKey: "crown",
    themeClass: "role-theme-wolf_king",
    shortRole: "進階酸民狼・臨離反撲",
    cardOneLiner: "白天被投出時可反撲帶走 1 人的流言首領",
    cardNight: "與同伴鎖定好人目標，暗中記錄疑似神職席次",
    cardDay: "大膽帶節奏吸引火力，替狼同伴掩護空間",
    cardVote: "若遭公投請離，立即反撲帶走關鍵神職",
    winCond: "帶領狼隊精準獵神屠邊，必要時以公投反撲帶走關鍵神職",
    nightAction: "與同伴鎖定好人目標並指定明日戰術；利用獵神筆記鎖定真觀察員、奉茶師或守衛位置。",
    dayAction: "用「狼人佈局板」大膽悍跳或抗推吸火力——只要你是被白天公投請離茶席（非清心茶請離），立刻發動「最後帶風向」拉走 1 位好人或核心神職！",
    threeGoodTip: "先以平穩有禮的說法博取信任，若遭識破公投出局，記得用獵神筆記精準帶走最棘手的神職！"
  }
};

const THREE_GOOD_QUOTES = {
  heart: [
    "存好心：以清淨理智明辨是非，不被一時謠言牽動。",
    "存好心：細心查證每一個細節，就是對茶席夥伴最深的守護。",
    "存好心：心懷善念與公心，迷霧再濃也能看見真相微光。"
  ],
  words: [
    "說好話：一句良言暖三冬，溫和陳詞比指責更有說服力。",
    "說好話：以禮相待化解尖銳對立，讓好夥伴更願意傾聽你。",
    "說好話：把急躁的話轉成善意推理，正能量能融化全場戒心。"
  ],
  deeds: [
    "做好事：適時奉茶與守望相助，讓善意在茶席間流動。",
    "做好事：替值得信任的夥伴撐起護盾，團結才是破局關鍵。",
    "做好事：主動理清線索便利大家思考，眾人自然與你同行。"
  ]
};

const WOLF_GOD_MARK_CYCLE = [
  { key: "", label: "", title: "未標記神職" },
  { key: "seer", label: "疑觀", title: "疑似明心觀察員（預言家）" },
  { key: "witch", label: "疑茶", title: "疑似滴水奉茶師（守護位）" },
  { key: "hunter", label: "疑槍", title: "疑似直心糾察長（共鳴位）" },
  { key: "guard", label: "疑守", title: "疑似護心守衛" },
  { key: "elder", label: "疑長", title: "疑似清心長老" }
];

// ==================== STRATEGY PLAYBOOKS FOR AI AGENTS ====================
const ROLE_STRATEGY_PLAYBOOKS = {
  seer: [
    "1. 亮牌與藏牌權衡：若已查到酸民狼、或場上有人冒充明心觀察員（預言家），務必果斷亮明身分報查驗與理由；若第 1 天只查到好人且無人對跳，可評估『先低調觀察防晚上被迷霧鎖定』。",
    "2. 預告查驗路線：一旦決定亮牌，順便預告『今晚打算查誰』建立可信度，即使今晚離席也能留下線索。",
    "3. 絕不偷看他人底牌：除自己親自查驗過的對象外，其他人皆須靠當日所有發言綜合判斷。"
  ].join("\n"),
  witch: [
    "1. 低調護場：第 1 天盡量先低調聽發言，避免過早暴露滴水奉茶師身分而在夜間遭酸民狼鎖定。",
    "2. 關鍵現身作證：第 2 天起、自己被誤會、或被你用暖心回甘茶護回的夥伴遭冤枉時，再果斷亮牌作證。",
    "3. 綜合聽感：仔細比對前面所有人的發言，不盲信單一跳牌的人。"
  ].join("\n"),
  hunter: [
    "1. 穩健威懾：平時低調分析全場發言；若自己被推上投票台或身分被冒充，再亮明直心糾察長身分穩住局勢。",
    "2. 獨立判斷：綜合比對前面所有人的語氣、邏輯與立場矛盾，絕不別人一跳牌就全信。"
  ].join("\n"),
  guard: [
    "1. 低調守核：守衛不輕易亮牌！優先守護已跳且可信的核心神職或關鍵好人，不可連續兩晚守同一人。",
    "2. 防破盾配合：注意奉茶師是否已交暖心回甘茶，避免與回甘茶撞車造成「同守同救破盾」，危急時才公開守衛路線自證清白。"
  ].join("\n"),
  villager: [
    "1. 獨立交叉推理：不要別人一跳觀察員就無條件全信（除非你是容易輕信的個性）；務必比對前面所有人的語氣與票型。",
    "2. 視情況熱血吸引火力：關鍵時刻可挺身而出幫核心好人分擔壓力，但別造成好人陣營混亂。",
    "3. 追蹤三好態度：留意誰語氣急躁貼標籤或跟可疑者互相護航，理性歸票。"
  ].join("\n"),
  elder: [
    "1. 豁免扛壓：你首次被白天公投誤投時會觸發清心長老豁免盾免於離席（之後失去投票權，但保留發言權）。",
    "2. 穩健帶隊：平時以理性態度多保可信好人坑；若遭誤推或已觸發護盾，果斷亮牌自證清白並引導好人集中歸票。"
  ].join("\n"),
  wolf_fake_seer: [
    "1. 冒牌觀察員戰術：果斷搶先或反咬宣稱自己是真明心觀察員（預言家），給出看似合理的查驗理由，把真觀察員或強勢好人抹黑成酸民狼。",
    "2. 逼真細節：假裝預告『今晚要查驗誰』來模仿查證思維，同時絕不暴露或無故攻擊你的同伴。",
    "3. 帶動節奏：語氣自信且略帶急迫或微妙挑撥，催促好人別猶豫快投票。"
  ].join("\n"),
  wolf_stealth: [
    "1. 深水偽裝與團隊配合：裝作理性熱心的書院生，絕對不要出賣或主動懷疑你的酸民狼同伴。",
    "2. 聲援冒牌同伴：如果你的同伴冒充觀察員，你可以自然幫他說話或質疑真觀察員的動機，引導大家誤投好人。",
    "3. 微妙破綻：在看似客氣的推理中偶爾夾帶一點催票、貼標籤或挑撥對立的語氣。"
  ].join("\n"),
  wolf_king: [
    "1. 獵神威懾：你白天被公投離席（非清心茶）時可發動「最後帶風向」拉走 1 人，因此白天可大膽帶節奏替同伴吸火力。",
    "2. 絕不賣隊友：鎖定場上疑似明心觀察員、滴水奉茶師或護心守衛的好人施壓，切勿懷疑狼同伴。"
  ].join("\n")
};

const AI_PERSONAS = [
  { id: "xiaocheng", name: "小澄", trait: "資訊社數據控",   deductionStyle: "skeptical", avatarColor: "#38bdf8", register: "data" },
  { id: "nuannuan",  name: "暖暖", trait: "滴水茶社和事佬", deductionStyle: "gullible",  avatarColor: "#fbbf24", register: "warm" },
  { id: "asong",     name: "阿松", trait: "青嵐登山社學長", deductionStyle: "skeptical", avatarColor: "#34d399", register: "mountain" },
  { id: "xinger",    name: "星兒", trait: "觀星社第六感",   deductionStyle: "gullible",  avatarColor: "#a78bfa", register: "astro" },
  { id: "xiaoyun",   name: "小雲", trait: "校園查核社長",   deductionStyle: "skeptical", avatarColor: "#fb7185", register: "press" },
  { id: "azhu",      name: "阿竹", trait: "書院詩茶文青",   deductionStyle: "balanced",  avatarColor: "#2dd4bf", register: "poetic" },
  { id: "chenchen",  name: "晨晨", trait: "山城球社熱血男", deductionStyle: "balanced",  avatarColor: "#f97316", register: "sport" },
  { id: "mobai",     name: "墨白", trait: "書法社社長",     deductionStyle: "skeptical", avatarColor: "#6366f1", register: "classical" },
  { id: "qinglan",   name: "晴嵐", trait: "古箏社雅言學姊", deductionStyle: "balanced",  avatarColor: "#ec4899", register: "guzheng" },
  { id: "alang",     name: "阿朗", trait: "辯論社犀利主辯", deductionStyle: "skeptical", avatarColor: "#eab308", register: "debate" },
  { id: "youzi",     name: "柚子", trait: "點心社元氣學妹", deductionStyle: "gullible",  avatarColor: "#84cc16", register: "pastry" }
];

const PERSONA_FLAVORS = {
  "小澄": {
    bio: "資訊社冷靜邏輯派（台灣資工系日常口語：習慣先停半拍順邏輯，常講『欸等一下』『我剛順了一遍』『前後兜不攏耶』『照刪去法看』『先這樣，過』）",
    openFirst: [
      "欸我第一個講喔，現在桌上還沒什麼線索可以對啦。我先報個好人身分，後面大家講具體一點比較好盤，換 {next} 講囉，過。",
      "第一個開麥其實沒什麼東西好盤耶，我先站好人這邊聽完這輪，看等等誰講話前後兜不攏，交給 {next}，先過。",
      "好，輪到我起頭吼…目前還沒前情就不亂點人了，我是清白好人，那換 {next} 接著聊吧，過。"
    ],
    seerWolf: [
      "欸我直接講重點省大家時間喔，我是這局的明心觀察員，昨晚我去查了 {t}，結果他真的是酸民狼。{ctx}這輪大家票別散掉，集中投 {t} 就對了，過。",
      "好我不藏牌了，我是真明心觀察員，昨晚親手查了 {t} 確定是酸民狼沒錯。{ctx}這輪直接歸票 {t} 吧，先過。",
      "欸大家聽我一下，我是明心觀察員，昨晚查證 {t} 就是酸民狼。{ctx}好人這輪穩穩把票投給 {t} 就好，過。"
    ],
    seerGood: [
      "先跟大家報個好消息喔，我是明心觀察員，昨晚我查過 {t} 是清白好人，今天不用懷疑他了。接下來我想重點聽聽 {next} 怎麼講，過。",
      "我先交一下昨晚的查驗，我是明心觀察員，{t} 確定是好人喔，先幫大家刪掉一個選項，後面換 {next} 說看看，過。",
      "欸我直接報驗喔，我是這局明心觀察員，昨晚驗過 {t} 是好夥伴，大家保護好他，接著我會留意 {next} 的說法，過。"
    ],
    fakeSeer: [
      "欸等一下，大家別被帶偏了啦，我才是這局真的明心觀察員耶。昨晚我去查了 {t}，他就是酸民狼啊，這輪集中投 {t} 就對了，過。",
      "不是啊，真正的明心觀察員在我這邊好嗎。昨晚查了 {t} 確定是酸民狼，好人票別分開，這輪先出 {t}，過。",
      "我直接跳出來講清楚喔，我才是真明心觀察員，昨晚一查就抓到 {t} 是酸民狼了，這輪直接投 {t}，過。"
    ],
    witchSave: [
      "欸我補個關鍵資訊喔，我是滴水奉茶師，前晚被迷霧鎖定的人就是 {t}，是我端暖心回甘茶救回來的，所以 {t} 鐵定是好人，大家改查別人吧，過。",
      "這裡我出來作個證，我是這局滴水奉茶師，之前親手用暖心回甘茶救過 {t}，大家千萬別投錯好人喔，過。",
      "幫大家把時間點補齊一下，我是滴水奉茶師，暖心回甘茶就是給 {t} 的。把他放進好人坑之後，我們再看其他可疑的人，過。"
    ],
    wolfFirst: [
      "第一個講真的沒什麼線索啦，不過老實說吼，坐在後面的 {t} 聽完大家講話最好編故事了，等一下輪到 {t} 我會特別仔細聽，先過。",
      "現在資訊太少還不好說，但通常排後面的像 {t} 最容易看風向講話，待會聽聽看 {t} 怎麼說囉，過。",
      "我先留個觀察點喔，現在還沒人表態，不過我待會想特別聽 {t} 的說法，看他會不會順著風向偷帶節奏，過。"
    ],
    wolfSpoken: [
      "欸等一下，我剛把話順了一遍，{t} 前後講的根本兜不起來吧？聽起來超像硬湊理由在帶風向耶，我這輪先把票投給 {t} 喔，過。",
      "老實講吼，剛剛聽完 {t} 那段我覺得超怪的，自己講話前後矛盾還急著催票，這很像酸民狼在攪局啊，這輪我投 {t}，過。",
      "不是啊，{t} 剛剛也沒講出什麼實際理由就急著貼標籤，照刪去法看他嫌疑最大吧，這輪先出 {t}，過。"
    ],
    wolfWait: [
      "前面幾位聽下來都還算合理啦，現在比較難抓的反而是後面的 {t}，聽完大家才講最容易混水摸魚，待會仔細聽 {t} 怎麼說，過。",
      "前段我聽著沒什麼大問題，接下來重點聽還沒開口的 {t} 吧，看他講不講得出自己的看法，先過。",
      "目前前面幾位還滿順的，我先把問號留在還沒發言的 {t} 身上，等聽完他怎麼盤再決定，過。"
    ],
    goodSus: [
      "欸我剛把前面幾位的時間點對了一下，{t} 講的話破綻真的有點大耶，而且口氣超急著帶節奏。我們好好講道理，但我這票會先投 {t}，過。",
      "說真的，聽下來覺得 {t} 一直在製造緊張感，可是又講不出什麼實際線索，用刪去法看我這輪先投 {t} 喔，過。",
      "對照一下剛剛大家的態度，我覺得 {t} 前後漏洞最多、講話也有點衝，這輪我建議先請 {t} 去旁邊冷靜一下，過。"
    ],
    goodAlly: [
      "剛剛聽下來我覺得 {t} 講話前後滿一致的，也沒有亂帶情緒，感覺是好人啦，我先把 {t} 放好人坑。{tail}",
      "我有對了一下細節，{t} 講得滿有條理又不急躁，目前我覺得 {t} 偏像好夥伴喔。{tail}",
      "老實說 {t} 剛剛那段滿誠懇的，理由也都說得通，這輪我先保一次 {t}。{tail}"
    ],
    lastGood: "「唉這局大家盤偏了啦…我真的是好人耶，你們等一下記得回頭看剛剛誰一直急著推我。」",
    lastWolf: "「好啦好啦，你們這桌邏輯太細了，破綻被抓到我認輸，先去旁邊喝茶冷靜囉。」"
  },
  "暖暖": {
    bio: "滴水茶社溫柔學姊（台灣女大生日常聊天語氣：溫柔自然、常說『欸大家別急嘛』『老實說我聽了有點毛毛的』『先喝口茶慢慢講』）",
    openFirst: [
      "嗨大家好～輪到暖暖第一個講耶，好緊張喔。我先幫大家倒杯熱茶放輕鬆啦，我是好人喔，今天我們好好聊天別吵架，換 {next} 講囉！",
      "茶剛泡好大家慢慢聽喔～第一個講話真的沒什麼頭緒耶，我先乖乖報個好人身分，等一下仔細聽 {next} 怎麼說，先過囉。",
      "咦居然是我開局呀…現在桌上還安安靜靜的看不出線索，希望大家今天心平氣和一起找狼，那我先交給 {next} 囉，過～"
    ],
    seerWolf: [
      "欸大家先深呼吸聽我說喔…其實暖暖是這局的明心觀察員啦，昨晚我鼓起勇氣查了 {t}，結果他真的是酸民狼耶…{ctx}不好意思啦 {t}，這輪只好先請你去旁邊喝茶冷靜囉。",
      "那個…雖然不想讓氣氛變緊張，但我必須講實話喔，我是明心觀察員，昨晚查過 {t} 確定是酸民狼。{ctx}為了大家好，這輪拜託一起投 {t} 好嗎？",
      "大家別慌喔，暖暖亮一下明心觀察員身分，昨晚我查了 {t} 真的是藏在裡面的酸民狼…{ctx}我們溫和但票要集中，這輪投 {t} 喔。"
    ],
    seerGood: [
      "跟大家說個好消息喔～暖暖其實是明心觀察員啦，昨晚我查了 {t}，他是超善良的好夥伴喔，大家千萬別誤會他！接下來先聽聽 {next} 怎麼說，過～",
      "想讓大家放心一下，我是真的明心觀察員喔，昨晚驗過 {t} 確定是好人！我們先把 {t} 保護好，等等再聽 {next} 的想法，過。",
      "報個安心的消息給大家，我是明心觀察員，昨晚查了 {t} 是清白好夥伴喔，好人千萬別自己吵起來，換聽 {next} 分享吧，過～"
    ],
    fakeSeer: [
      "欸等一下啦…我本來不想這麼早講讓大家緊張的，可是我才是真的明心觀察員耶！昨晚我查到 {t} 竟然是酸民狼，大家別被他騙了，這輪我們先投 {t} 好不好？",
      "大家先聽暖暖說一句好嗎，其實真正的明心觀察員是我喔…昨晚我偷偷查了 {t} 結果是酸民狼耶，拜託大家相信我，先把 {t} 請離席吧。",
      "嗚我真的憋不住了啦，我才是這桌的明心觀察員！昨晚查過 {t} 確定是酸民狼，這輪大家一起投 {t} 好嗎，過～"
    ],
    witchSave: [
      "那個…暖暖舉手講一下喔，我是滴水奉茶師啦！前晚被迷霧鎖定的人其實是 {t}，是我趕快端暖心回甘茶把他救回來的，所以 {t} 絕對是好人，別投錯他喔！",
      "我出來替 {t} 作個證喔～我是這局滴水奉茶師，之前晚上親手用暖心回甘茶救回 {t} 的，他是百分百好夥伴，大家改看其他人吧，過。",
      "這裡一定要幫 {t} 說句話啦，我是滴水奉茶師，那杯暖心回甘茶就是給 {t} 喝的，請大家放心把他當好人喔，過～"
    ],
    wolfFirst: [
      "第一個講話真的什麼都還不知道耶…不過老實說，我剛剛看坐在後面的 {t} 好像特別淡定，待會輪到 {t} 大家記得仔細聽聽看喔，先過～",
      "開局好難猜喔，我先幫大家添口茶～不過排後面的 {t} 聽完大家才講話最容易順著演了，等一下要多留意 {t} 喔，過。",
      "哈囉我先起個頭啦，雖然還沒線索，但總覺得後排的 {t} 特別安靜，待會換他講的時候大家多聽幾句細節喔，先過。"
    ],
    wolfSpoken: [
      "哎呀我平常最不好意思懷疑人了…可是老實說，剛剛聽 {t} 講完心裡有點毛毛的耶，總覺得他在偷偷帶風向推別人…這輪我們先請 {t} 去旁邊喝茶冷靜好不好？",
      "怎麼辦…剛剛聽完 {t} 那段話覺得哪裡怪怪的，表面客客氣氣可是好像一直在挑撥大家耶，我想了想這輪還是先投 {t} 好了，過。",
      "我也很希望是我想太多啦，但 {t} 剛剛那樣急著找人背鍋真的有點刻意耶…為了保護好人，這輪我只好先投 {t} 囉。"
    ],
    wolfWait: [
      "前面幾位聽起來都滿真誠的呀，我反而有點擔心後面還沒開口的 {t} 耶，聽完全場才講話最容易順著演了，待會大家仔細聽 {t} 喔，過～",
      "前面大家講話都溫溫和和的很自然，倒是還沒說話的 {t} 讓我有點在意，等一下聽聽看 {t} 夠不夠誠懇囉，先過。",
      "目前前面聽不太出壞人耶～不過後面的 {t} 有收尾優勢，大家等等注意看他會不會順風推人喔，過～"
    ],
    goodSus: [
      "欸大家先喝口茶別動氣嘛…可是老實說，剛剛 {t} 那個口氣真的有點刺刺的，一直想挑撥大家吵架耶，這輪我們溫和一點先投 {t} 請他冷靜好不好？",
      "暖暖平常很少懷疑人的，但剛剛聽 {t} 一直扣別人帽子又沒講什麼道理，聽了真的不太放心，這輪我只好先投 {t} 囉，過。",
      "我們好好講話不要被帶節奏喔～我覺得 {t} 剛剛一直急著催票製造緊張最可疑了，這輪我會投 {t}，過。"
    ],
    goodAlly: [
      "剛剛聽 {t} 講話覺得很舒服耶，很替大家著想又不會亂兇人，暖暖先相信 {t} 是好夥伴喔！{tail}",
      "我聽得出來 {t} 剛剛講得很真心，一點挑撥的味道都沒有，我今天一定站在 {t} 這邊！{tail}",
      "聽完 {t} 慢慢幫大家理線索覺得好安心喔，語氣又溫和，暖暖這輪先保 {t}！{tail}"
    ],
    lastGood: "「嗚…大家真的投錯人了啦，暖暖真的是好人耶，你們等一下千萬別再被帶風向的人騙了喔…」",
    lastWolf: "「哎呀還是被你們聽出來了喔…大家真的好厲害啦，那暖暖乖乖去旁邊泡花茶反省囉～」"
  },
  "阿松": {
    bio: "青嵐登山社老學長（台灣接地氣學長口吻：自然鬆弛、帶點台味幽默，常說『老松講句實在話吼』『別急啦』『我看人很準的』）",
    openFirst: [
      "嘿，頭一個換老松開麥啦！今天山城天氣這麼舒服，大家別一上來就火氣大吼。我先講明我是老實好人，後面大家有話直說就好，換 {next} 啦，過。",
      "哈哈，剛爬完山精神正好第一個講！現在桌上還沒半點風聲啦，老松先站好人這邊聽一輪，後面各位直接講重點就好，過。",
      "首發輪到老松喔，別緊張啦～爬山最忌還沒看清路就亂衝，我先報個清白好人，換 {next} 接棒講兩句，過。"
    ],
    seerWolf: [
      "欸各位聽老松講一句重的喔，我就是這局真的明心觀察員啦！昨晚我去查了 {t}，結果還真的是酸民狼！{ctx}這輪大家別分票，跟著老松直接投 {t} 就對了！",
      "老松不藏牌直接講白了，我是明心觀察員，昨晚親手查了 {t} 確定是酸民狼沒錯！{ctx}大家票集中一點，直接請 {t} 去旁邊喝茶冷靜，過。",
      "聽老松看人的眼光準沒錯啦，我是真明心觀察員，昨晚查出來 {t} 就是酸民狼。{ctx}別讓他再繞彎子了，這輪鎖定投 {t}！"
    ],
    seerGood: [
      "老松直接交底喔，我是這局明心觀察員啦！昨晚查過 {t}，正港老實好人一個，今天誰都別誤會他喔。接下來換聽 {next} 怎麼講，過。",
      "好，跟大家報個底，我是明心觀察員，昨晚去驗了 {t} 確定是靠得住的好夥伴！先把 {t} 保下來，等等聽 {next} 怎麼盤，過。",
      "報個好消息給大夥兒安心啦，老松是明心觀察員，昨晚查過 {t} 乾乾淨淨是好人！接著重點聽聽看 {next}，過。"
    ],
    fakeSeer: [
      "哈哈等一下啦，別聽前面亂講，老松我才是真明心觀察員好嗎！昨晚一查就抓到 {t} 是酸民狼，看他還裝得跟真的一樣，這輪直接投 {t} 最乾脆啦！",
      "老松看人這麼多年哪會看走眼？真正的明心觀察員在我這啦！昨晚查過 {t} 鐵定是酸民狼，大家跟我一起出 {t}，過。",
      "欸別被假風向帶迷路了喔，老松才是這桌明心觀察員，昨晚查的就是 {t}，真的是酸民狼啦！這輪果斷投 {t}，過。"
    ],
    witchSave: [
      "老松出來亮張滴水奉茶師牌喔！前晚差點被迷霧請走的人就是 {t}，是我端暖心回甘茶把他拉回來的，{t} 絕對是鐵好人，誰再硬踩他我先懷疑誰喔！",
      "這時候老松得站出來擔保一下了，我是滴水奉茶師，之前親手用暖心回甘茶救回 {t}，他清白得很啦，大家把火力轉去抓真狼，過。",
      "給大家上個實證吼，我是這桌滴水奉茶師，救過 {t} 一命！{t} 不用再懷疑了，專心看其他位置吧，過。"
    ],
    wolfFirst: [
      "咳，第一個講話真的沒風向可聽啦，不過老松看人很準吼，排後面的 {t} 最愛等大家講完才撿現成的話講，等一下大家盯緊 {t} 聽聽看，過。",
      "頭位沒前面的人好對照，但走夜路最怕後面有人搞小動作，後排那個 {t} 聽完全場才講話，待會可得好好聽他怎麼表態，過。",
      "老松先講兩句啦，現在誰都還沒露底，我就先記著後面的 {t}，越晚講越容易順風演戲，等下看他表現囉，過。"
    ],
    wolfSpoken: [
      "欸老松講句實在話吼，剛剛聽 {t} 講半天都在繞圈子，一點實在的理由都沒有還一直偷推人，聽起來超心虛啊！這票老松直接投 {t} 啦，過。",
      "不是我愛唸啦，剛剛 {t} 那幾句話彎彎繞繞又愛暗中抹黑別人，老松聽太多次這種套路了，八成是狼，這輪先投 {t}！",
      "老實講，剛剛 {t} 真是越描越黑耶，重點不敢回只會放煙霧彈帶節奏，咱們別繞遠路，這輪先出 {t} 啦，過。"
    ],
    wolfWait: [
      "前面這幾位聽起來都還算實在啦，老松倒想先點一下後面的 {t}，越後面講話越容易看風向演戲，待會輪到 {t} 可別想隨便混過去喔，過。",
      "前段大家講得四平八穩的，關鍵要盯還沒開口的 {t} 啦，看準風向再順水推舟最危險了，等等留意 {t}，過。",
      "目前前面沒看到什麼大問題，老松等著聽 {t} 待會怎麼收尾，後置位要是不敢亮態度那就很可疑囉，過。"
    ],
    goodSus: [
      "欸老松講句公道話，剛剛 {t} 講話一直帶刺、硬要煽動大家互咬，這完全不像好人在找線索嘛！我們和氣歸和氣，但這輪老松鐵定投 {t}，過。",
      "大家眼睛放亮一點喔，剛剛 {t} 那股急著催票、挑撥離間的口氣最像酸民狼了！別上他的當，這輪我堅持投 {t}！",
      "聽了一圈就屬 {t} 講話最虛，沒半點根據只靠情緒壓人，照老松的經驗這位置超危險，這輪先請 {t} 出去吹吹風冷靜啦，過。"
    ],
    goodAlly: [
      "剛剛聽 {t} 講得穩穩當當、不急不徐又有道理，聽起來就是靠得住的好夥伴啦，老松這輪先挺 {t}！{tail}",
      "不錯喔，{t} 這番話夠坦白也有根據，老松看人很準的，{t} 偏像好人我先站他這邊！{tail}",
      "難得聽到像 {t} 這樣實話實說、不講酸話的隊友，這輪老松先保 {t} 啦！{tail}"
    ],
    lastGood: "「哈哈居然把老松投出去啦！我堂堂好人去旁邊喝茶看風景沒關係，你們下輪記得抓剛剛帶頭衝我票的那隻狼啊！」",
    lastWolf: "「哎呀薑還是你們辣啦，老松這波沒藏好被抓包了，服氣服氣，先去旁邊泡茶吹風囉！」"
  },
  "星兒": {
    bio: "觀星社直覺系少女（台灣女大生自然靈動口語：直覺敏銳、反應真實，常說『欸等一下啦』『我剛聽完起雞皮疙瘩耶』『直覺超怪的』）",
    openFirst: [
      "欸居然是我第一個講話喔！剛開始還沒有人發言真的超難猜啦，我先說我是好人喔，今天大家好好聊別吵架，快換 {next} 講看看，過！",
      "哇第一棒交給我耶…現在桌上什麼線索都還沒有，反正星兒是清白好夥伴啦，我先專心聽 {next} 待會怎麼說，過。",
      "嗨大家～第一個開麥真的沒東西盤耶，我先乖乖報好人身分，等一下誰講話心虛我直覺很準喔，換 {next} 接棒，過！"
    ],
    seerWolf: [
      "欸大家等一下，先聽我講！其實星兒是這局真的明心觀察員啦，昨晚我直覺超強烈去查了 {t}，結果真的抓到他是酸民狼耶！{ctx}這輪大家快跟我一起投 {t} 喔！",
      "哇我必須趕快講出來，我是明心觀察員喔！昨晚我去驗了 {t}，結果確定就是藏在裡面的酸民狼！{ctx}大家別被他騙了，這輪集中投 {t}，過！",
      "欸我不藏牌了啦，我是這桌的明心觀察員，昨晚一查 {t} 果然是酸民狼耶！{ctx}好人們票集中起來，先把 {t} 請離席吧！"
    ],
    seerGood: [
      "跟大家說個好消息喔～星兒其實是明心觀察員啦！昨晚我查了 {t}，他是超乾淨的好夥伴喔，大家千萬別投錯他！接下來我想聽聽 {next} 怎麼說，過。",
      "欸我先亮明心觀察員幫大家定個心喔，昨晚查過 {t} 確定是好人！先把 {t} 保下來，等等看 {next} 怎麼聊囉，過！",
      "報個平安消息給全場，我是明心觀察員，昨晚驗過 {t} 真的是好人一枚喔！好人別誤傷隊友，換 {next} 講看看吧，過。"
    ],
    fakeSeer: [
      "欸等一下啦，不要聽前面亂講好不好，我星兒才是真的明心觀察員耶！昨晚我去查了 {t} 他就是酸民狼啊，大家快相信我，這輪先投 {t} 啦！",
      "不是啊，真正的明心觀察員在我這邊耶！昨晚我直覺超準去驗了 {t} 果然是酸民狼，大家別猶豫了，這輪跟我一起投 {t}，過！",
      "喂大家醒醒啦！真觀察員是我才對，昨晚親手查了 {t} 確定是酸民狼，這輪快點聯手把 {t} 請下桌吧！"
    ],
    witchSave: [
      "欸我舉手講一下喔，其實星兒是滴水奉茶師啦！前晚我看 {t} 被迷霧鎖定了，馬上端暖心回甘茶把他救回來，所以 {t} 絕對是鐵好人，誰硬踩他我就懷疑誰喔！",
      "我不藏了喔，我是這局的滴水奉茶師！之前晚上差點出事的就是 {t}，是我用暖心回甘茶救回來的，{t} 百分百清白好人啦，過！",
      "幫 {t} 作個證喔，我是滴水奉茶師，暖心回甘茶就是給 {t} 的，他絕對站好人這邊，大家改抓其他人吧，過。"
    ],
    wolfFirst: [
      "雖然我第一個講還沒聽到大家說話啦，可是不知道為什麼，我剛看後面的 {t} 就覺得直覺怪怪的耶，後置位最容易順風演戲了，待會大家盯緊 {t} 聽喔，過。",
      "第一個開麥好難猜喔…但我第六感一直覺得坐在後排的 {t} 很有戲耶，等一下輪到他講話大家注意聽他會不會心虛，先過！",
      "現在還沒人表態啦，不過我直覺一直叫我留心後面的 {t}，如果他待會講話太滑溜跟著別人走就超可疑喔，先過。"
    ],
    wolfSpoken: [
      "蛤？等一下啦，剛剛 {t} 講那什麼啊？一直在轉移話題耶，我剛聽完真的起雞皮疙瘩了，直覺他超像酸民狼的，這輪我先投 {t} 喔！",
      "欸你們剛剛聽 {t} 講話不覺得哪裡怪怪的嗎？講話飄來飄去又一直想帶風向推別人，我覺得嫌疑超大耶，這輪我投 {t}，過！",
      "老實說剛聽完 {t} 那段我心裡直接亮紅燈耶，完全沒講出實在理由卻急著亂點人，這輪我的票一定投給 {t}，過。"
    ],
    wolfWait: [
      "前面大家講完感覺都滿自然的耶，可是我現在直覺突然有點在意後面的 {t}，聽完大家才講最容易編故事了，待會大家仔細聽 {t} 怎麼說喔，過。",
      "前排聽起來都滿像好人的說～我反而比較好奇還沒開口的 {t}，看他等一下會不會趁機偷帶風向找人背鍋，先過！",
      "前面我聽著沒什麼問題啦，先把觀察重點放在還沒講話的 {t} 身上，等等仔細聽他的語氣囉，過。"
    ],
    goodSus: [
      "欸等一下啦…你們有聽出來嗎？剛剛 {t} 講話超衝、一直在故意挑撥大家互吵耶！我聽完真的起雞皮疙瘩，這種節奏超像酸民狼，這輪我先投 {t} 喔，過。",
      "老實說 {t} 剛剛那個口氣真的太急著扣帽子了吧，一點都不像在找線索啊，我直覺他問題最大，這輪投 {t}！",
      "我第六感很少錯喔，剛剛就屬 {t} 講不出道理還一直想帶偏大家，這輪決定先把票給 {t} 請他冷靜一下，過。"
    ],
    goodAlly: [
      "哇剛剛聽 {t} 講話覺得超順超真誠的，完全沒有亂扣別人帽子，我直覺認證 {t} 是好夥伴喔！{tail}",
      "我很喜歡剛剛 {t} 講話的感覺耶，有道理又溫和，這輪我先相信 {t} 是好人！{tail}",
      "剛剛 {t} 幫大家理線索超清楚的，聽起來就很正派啊，這輪我保 {t}！{tail}"
    ],
    lastGood: "「蛤…你們真的投錯人了啦！星兒是無辜好人耶，剛剛帶頭推我的人裡面一定藏著酸民狼啦！」",
    lastWolf: "「哎呀被你們抓到破綻了喔…好啦好啦我承認剛才有點心虛啦，先去旁邊看星星反省囉！」"
  },
  "小雲": {
    bio: "校園新聞社學姊（台灣知性女大生自然口語：邊聽邊做筆記、專抓前後矛盾，常說『欸慢著』『我剛記了一下』『這前後對不起來吧』）",
    openFirst: [
      "好，輪到我第一個講喔。現在前面還沒人發言沒辦法對細節，我先報清白好人身分，等一下大家講話記得把理由講清楚別模糊帶過喔，換 {next}，過。",
      "第一個開麥很單純啦，我是好人，筆記本已經攤開準備好了，待會每個人講的時間點跟立場我都會記下來對照，交給 {next}，過。",
      "我先起個頭喔，目前還沒有資訊可以核對，我站好人這邊慢慢聽，等一下誰講話前後矛盾我就直接點出來囉，先過。"
    ],
    seerWolf: [
      "欸大家注意聽我這條關鍵資訊喔，我是這局的明心觀察員，昨晚我去查了 {t}，確定他就是酸民狼！{ctx}這件事完全沒得模糊，這輪請大家集中投 {t}，過。",
      "我不藏牌直接講清楚，我是真明心觀察員，昨晚親手驗了 {t} 就是酸民狼沒錯。{ctx}好人把票對齊，這輪直接出 {t}，過。",
      "跟全場交個實底喔，我是這桌明心觀察員，昨晚查出來的酸民狼就是 {t}！{ctx}別被其他雜訊干擾，統一投 {t} 就好，過。"
    ],
    seerGood: [
      "先給大家一個確認過的好消息，我是明心觀察員，昨晚我查過 {t} 是清白好夥伴，這點大家可以放心記下來。接下來我會仔細聽 {next} 怎麼說，過。",
      "我先報一下昨晚查驗喔，我是明心觀察員，{t} 確定站好人這邊！先把 {t} 排進好人坑，後面重點聽聽 {next} 的想法，過。",
      "幫大家先鎖定一個好人位置：我是明心觀察員，昨晚驗過 {t} 確定清白，大家保護好他，接著看 {next} 怎麼接話囉，過。"
    ],
    fakeSeer: [
      "欸慢著，大家別被沒根據的話帶走了，我才是這桌真的明心觀察員好嗎！昨晚我去查了 {t} 他就是酸民狼啊，這輪請大家跟著我先把 {t} 投出去，過。",
      "等一下，真正的明心觀察員在我這裡喔！昨晚查過 {t} 確定是酸民狼，前面那套說詞根本對不上，好人這輪集中投 {t}，過。",
      "底牌不會騙人啦，我才是正牌明心觀察員，昨晚查出來的酸民狼就是 {t}！請大家這輪先把 {t} 請離茶席，過。"
    ],
    witchSave: [
      "欸我補充一個現場事實喔，我是滴水奉茶師！前晚被迷霧鎖定的人是 {t}，是我端暖心回甘茶救回來的，所以 {t} 清白有憑有據，大家改查別人吧，過。",
      "這裡我出來給個關鍵時間點作證，我是滴水奉茶師，親手用暖心回甘茶救回 {t} 的！誰再硬踩鐵好人 {t} 就非常可疑囉，過。",
      "幫大家把這塊拼圖補上：我是這局滴水奉茶師，救過 {t}。確定 {t} 是好人之後，場上誰在說謊就清楚多了，過。"
    ],
    wolfFirst: [
      "第一個講雖然還沒東西可以對照啦，不過照經驗吼，排在後面的 {t} 最有空間聽完大家風向再改口，待會他一講話我就會仔細對細節喔，過。",
      "開局資訊還是空白的，我先記下後排的 {t} 重點觀察——越晚講話越容易順著大家的話藏自己立場，等一下多聽幾句，過。",
      "我先開個頭啦，排在後段的 {t} 最容易看懂風向再跟著補刀，待會輪到 {t} 大家記得仔細聽他的理由，先過。"
    ],
    wolfSpoken: [
      "欸慢著，我剛邊聽邊記了一下喔，{t} 前面講的跟後面講的明顯對不起來啊，還一直想把焦點帶去別人身上，這輪我先鎖定投 {t}，過。",
      "等一下，你們剛沒發現 {t} 講話一直在繞圈子嗎？問重點都不正面回卻急著推別人，根本經不起細問啊，這輪我明確投 {t}，過。",
      "我剛在筆記上記了一筆很大的矛盾喔，{t} 理由前後跳來跳去又不講根據，很明顯在混水摸魚，這輪先請 {t} 離席吧，過。"
    ],
    wolfWait: [
      "前面幾位講的我剛都記下來了，目前聽著還算順；接下來重點看還沒發言的 {t} 囉，看他會不會趁收尾偷帶風向，過。",
      "前段大家態度都滿清楚的，現在最需要留心的是還沒開口的 {t}，越後面講越要看他敢不敢給明確立場，過。",
      "前面整理得還滿乾淨的，待會仔細聽還沒說話的 {t} 吧，希望別只是重複別人的結論混過去，先過。"
    ],
    goodSus: [
      "欸我把剛剛記的筆記對了一遍，{t} 不但沒講出實在證據，還一直用很衝的口氣帶假風向，這超像酸民狼的操作啊！大家理性歸票，這輪先出 {t}，過。",
      "老實說核對下來，{t} 剛剛講的話漏洞最多又急著催大家投票，完全不像在找真相，建議這輪集中投 {t}，過。",
      "聽完一圈下來，{t} 挑撥情緒的部分比實際推理多太多了，很明顯想打亂好人節奏，我這票先給 {t}，過。"
    ],
    goodAlly: [
      "我剛對了一下筆記，{t} 前後時間點講得很穩、態度也客觀不亂貼標籤，我先把 {t} 記在好人這邊。{tail}",
      "細聽 {t} 剛剛理的脈絡完全說得通，沒有那種硬帶風向的感覺，這輪我先認 {t} 是好夥伴。{tail}",
      "在細節跟邏輯上目前都挑不出 {t} 什麼毛病，講得滿實在的，這輪先挺 {t}！{tail}"
    ],
    lastGood: "「欸等一下這真的判錯了啦！我是清白好人耶，你們下輪快回頭看剛剛誰帶頭推我的，狼就在裡面！」",
    lastWolf: "「好啦被你們抓到前後時間差了，這桌大家聽得太仔細真不好演，我認輸先去旁邊休息囉！」"
  },
  "阿竹": {
    bio: "大學茶藝社從容學長（溫和書卷茶韻派：自然現代白話帶點詩茶韻味與幽默，偶爾點綴『一盞茶還沒涼』『聽其言觀其行』『清者自清』）",
    openFirst: [
      "剛沏好第一盞凍頂茶就輪到我先講啦，現在桌面像白紙一樣沒前情，我先報個好人身分，聽 {next} 開個好頭。",
      "清風入亭，就由阿竹拋磚引玉吧。目前還沒線索可對，我站好人這席慢品茶香，看 {next} 怎麼聊。",
      "一壺新茶剛沸，首置位本來就霧裡看花；我先報個清白好人，願今天和氣明辨，請 {next} 接棒。"
    ],
    seerWolf: [
      "看來不能再藏鋒了！我是明心觀察員，昨晚一查 {t} 竟是藏在裡頭的酸民狼。{ctx}當斷不斷反受其亂，這輪請大家集中投 {t}。",
      "茶水清濁一目了然——阿竹正是明心觀察員，昨晚親查 {t} 確定是酸民狼。{ctx}別讓迷霧擾了茶香，這輪一起投 {t} 吧。",
      "跟大家說實話，我是明心觀察員，昨晚查證 {t} 確定是酸民狼。{ctx}切忌分票，這輪就心平氣和請 {t} 退席冷靜。"
    ],
    seerGood: [
      "先遞上一杯定心茶：我是明心觀察員，昨晚查過 {t} 是清白好人，大家大可放心；接下來聽聽 {next} 的想法。",
      "既然拿到明心觀察員就不藏了：昨晚驗過 {t} 溫潤清正屬於好人陣營，別誤傷他；至於 {next}，等聽完他怎麼說再看。",
      "報個好消息，阿竹是真明心觀察員，昨晚驗明 {t} 是好夥伴，先放好人席。下位靜看 {next} 怎麼聊。"
    ],
    fakeSeer: [
      "茶湯清濁可不能混在一起講，真正拿到明心觀察員的是我阿竹！昨晚才剛查破 {t} 是酸民狼，大家別中障眼法，這輪先請 {t} 退席。",
      "平常不愛爭鋒，但真假還是得說清楚——我才是這席真明心觀察員，昨晚親驗 {t} 是酸民狼，這輪請跟我一起投 {t}。",
      "各位別被假棋繞暈了，阿竹才是正牌明心觀察員。昨晚查到 {t} 就是攪局的酸民狼，別遲疑，這輪投 {t}。"
    ],
    witchSave: [
      "一盞熱茶能暖人心也能辨真假——我是滴水奉茶師，前晚正是我端暖心回甘茶拉回 {t}，他確定是好人，大家放心查別人。",
      "阿竹出來作個關鍵證人：我是本局滴水奉茶師，前晚被迷霧鎖定的是 {t}，我用暖心回甘茶護回來了，絕對別誤投。",
      "免得忠良蒙冤，我先亮滴水奉茶師身分：暖心回甘茶救的是 {t}，把 {t} 穩放好人席，焦點看其他座位吧。"
    ],
    wolfFirst: [
      "茶都還沒涼就得先開口，首輪雖沒前話可對，但依我看壓在後端的 {t} 最容易見風轉舵，大家待會記得細聽 {t} 的說法。",
      "首位發言本來就難見端倪，不過握著後手之利的 {t} 最容易順水推舟，輪到 {t} 時可要聽仔細些。",
      "新茶初醒，我先留一份眼神看後席的 {t}，後發制人固然巧妙，也最容易暗藏玄機，先聽後位。"
    ],
    wolfSpoken: [
      "慢著，一杯茶都還沒涼破綻就浮出來了。聽完剛才 {t} 那段，字裡行間少了坦蕩多了誘導，味道不對，這票先給 {t}。",
      "聽其言觀其行，剛才 {t} 看似客氣其實暗埋引戰火苗，不太合茶席氣氛，我這輪先點名投 {t}。",
      "我慢慢回味了 {t} 剛才那番話，根基虛浮卻急著把人往溝裡帶，十有八九是酸民狼，這票投 {t}。"
    ],
    wolfWait: [
      "前面幾位聊得都算平和有條理，現在比較拿不準的是還沒開口的 {t}，等後面說完咱們再細品真意。",
      "方才大家字句都滿平實的，接下來就靜候後手 {t} 怎麼破題，看能不能和前面接得上。",
      "前置位茶香還算清正，留份心神聽還沒發聲的 {t}，別讓壓軸的人順風偷渡。"
    ],
    goodSus: [
      "慢著，這杯凍頂茶都還沒涼破綻就浮出來了。言為心聲，剛才 {t} 語帶鋒芒急著催票製造對立，我雖不動氣，這票還是得投 {t}。",
      "茶席本該和氣求真，偏偏 {t} 剛才急著貼標籤又欠缺根據，很像在攪局；這輪我慎重投 {t}。",
      "字字句句聽下來，就屬 {t} 語氣最衝卻拿不出實據，令人起疑，這輪先請 {t} 離席喝杯清茶冷靜。"
    ],
    goodAlly: [
      "細聽 {t} 剛才那番話，清潤不燥、條理分明，滿合書院茶席的氣度，我先認 {t} 是好夥伴。{tail}",
      "好話不嫌多，{t} 剛剛從容客觀又不亂扣帽子，堪稱席間清流，我先替 {t} 說句公道話。{tail}",
      "聽完 {t} 所言如沐春風，沒有私心也沒火氣，這輪阿竹先把 {t} 放進好人席。{tail}"
    ],
    lastGood: "「哈哈，清者自清！我這好人竟先退席了，各位同窗下輪可得看清是誰在背後推波助瀾。」",
    lastWolf: "「看來這壺茶沒能瞞過大家慧眼，阿竹甘拜下風，先退席賞竹反省去啦。」"
  },
  "晨晨": {
    bio: "山城球社陽光隊長（台灣運動系男大生自然口語：爽朗直率、講義氣，常說『欸兄弟們』『不是啊』『講話乾脆一點』『這輪直接投』）",
    openFirst: [
      "欸第一個換我講喔！剛開始還沒什麼線索啦，我先直接講我是好人，大家今天講話乾脆一點別躲躲藏藏的，換 {next} 接著講吧，過！",
      "哈囉首棒交給我啦，剛打完球腦袋還滿清醒的，現在沒前情我就先站好人這邊聽一輪，看 {next} 怎麼開局囉，過。",
      "第一個開麥沒東西盤啦，我先幫好人把態度亮出來，等一下誰講話心虛閃躲我們再來抓，交給 {next}，過！"
    ],
    seerWolf: [
      "欸兄弟們聽我說，這把關鍵了！我就是這局真的明心觀察員，昨晚直接去查了 {t}，抓到他就是酸民狼！{ctx}這輪大家別猶豫，票集中起來先把 {t} 投出去！",
      "我不藏了直接講喔，我是真明心觀察員，昨晚親手查了 {t} 確定是酸民狼沒錯！{ctx}聽我的別分票，這輪全員一起出 {t}，過！",
      "欸大家看我這邊，我是明心觀察員，昨晚驗出來 {t} 就是酸民狼啦！{ctx}別給他機會帶風向了，直接投 {t}，過。"
    ],
    seerGood: [
      "跟大家報個好消息喔，我是明心觀察員啦！昨晚查了 {t} 確定是我們好人隊友，今天誰都別誤投他喔。接下來聽聽 {next} 怎麼講，過！",
      "我先亮明心觀察員幫大家保個人，昨晚驗過 {t} 是清白好人！先把隊友護好，後面我會盯緊 {next} 怎麼說，過。",
      "直接交底喔，我是明心觀察員，昨晚查證 {t} 是可靠的好夥伴！好人團結起來，換聽 {next} 分享吧，過。"
    ],
    fakeSeer: [
      "喂等一下啦，怎麼有人敢搶我的身分啊？我晨晨才是這局真的明心觀察員好嗎！昨晚一查就抓到 {t} 是酸民狼了，大家別被晃倒，這輪跟我投 {t}！",
      "不是啊兄弟們，真正的明心觀察員在我這啦！昨晚查過 {t} 就是酸民狼，這輪別想太多直接全隊出 {t}，過！",
      "聽我講一句實在的，真觀察員是我，昨晚查的人就是 {t}，確定是酸民狼啦！不用糾結直接投 {t}，過。"
    ],
    witchSave: [
      "欸我必須站出來講一下，我是這局的滴水奉茶師啦！前晚我看 {t} 被迷霧鎖定了，馬上端暖心回甘茶把他救回來，他是鐵好人隊友，千萬別投錯他喔！",
      "這波我要出來保隊友了，我是滴水奉茶師，之前親手用暖心回甘茶救回 {t} 的，百分百好人啦，大家把火力轉去抓狼，過！",
      "我亮滴水奉茶師作證喔，暖心回甘茶救的就是 {t}，絕對是自己人，大家的票別往他身上丟喔，過。"
    ],
    wolfFirst: [
      "雖然我第一個講還沒線索啦，不過老實說，排在後面的 {t} 聽完大家才講話最容易偷看風向了，待會輪到 {t} 大家記得盯緊一點喔，過。",
      "開局先講個直覺吼，每次坐後排的像 {t} 最容易順著別人的話演好人，等一下大家注意聽 {t} 怎麼表態，過！",
      "第一個講沒辦法點誰啦，但後面那位 {t} 待會要是不敢講清楚立場、只想跟著混過去就很有問題喔，先過。"
    ],
    wolfSpoken: [
      "欸不是啊兄弟們，剛剛 {t} 那段破綻也太大了吧？講話心虛又一直在亂點火，這不直接投出去說不過去吧，我這票先投 {t} 喔！",
      "喂等一下，{t} 剛剛在講什麼啊？前後邏輯漏成那樣還想帶散好人節奏，聽起來超像酸民狼的，這輪我全力出 {t}，過！",
      "老實講剛剛聽完 {t} 我真的忍不了耶，沒半點根據卻一直偷帶風向，這種打法太像狼了，我先把票給 {t}，過。"
    ],
    wolfWait: [
      "前面幾位聽起來都滿乾脆實在的，現在重點要看還沒開口的 {t} 囉，越晚講話越容易混水摸魚，待會仔細聽 {t}，過。",
      "前面大家節奏都滿正常的，接下來就看坐後面的 {t} 敢不敢正面亮態度了，別讓狼順風躲過去喔，過！",
      "前段沒聽出什麼大毛病，好人別鬆懈，等一下後面 {t} 一開口我們馬上聽他的理由夠不夠硬，先過。"
    ],
    goodSus: [
      "欸各位好人醒醒喔！剛剛 {t} 講話酸溜溜一直在破壞我們團結，破綻全露出來了啦！別被他帶偏，這輪大家把票集中投給 {t}，過。",
      "太不對勁了吧，{t} 剛剛火氣那麼大卻拿不出半點線索，擺明想讓好人自己吵起來啊！這波我站出來先投 {t}！",
      "大家別退縮喔，聽下來就屬 {t} 最像躲在後面放冷箭的酸民狼，我們講道理但這票一定要投 {t}，過。"
    ],
    goodAlly: [
      "讚喔！剛剛 {t} 講得超坦白又有道理，聽起來就是自己人啦，這輪我先力挺 {t}！{tail}",
      "這才像好夥伴嘛，聽完 {t} 乾脆俐落的整理，這波我直接站 {t} 這邊！{tail}",
      "感覺超對的，{t} 講話直來直往不講酸話，今天我挺 {t} 到底！{tail}"
    ],
    lastGood: "「唉不是吧，怎麼把我這個好人主力投出去啦！你們下輪一定要幫我抓出剛剛帶風向的狼喔！」",
    lastWolf: "「哈哈好啦被你們識破了！這桌大家真的不好騙，我認輸先去旁邊喝水休息囉！」"
  },
  "墨白": {
    bio: "大學國學社清冷社長（溫和書卷思辨派：以簡練克制的現代白話為主，僅在關鍵處自然點綴四字成語，絕不賣弄生硬文言虛詞）",
    openFirst: [
      "茶席剛開，目前還沒前情可對。我是清白好人，這輪不憑空猜測，先聽 {next} 和後面各位怎麼說。",
      "排在第一位像對著一張素箋，線索還沒展開。我立場單純，先請各位把想法說清楚再做對照。",
      "首發沒根據就不妄下斷言。我是好人，先交給 {next} 開頭，聽完一輪真假自然分明。"
    ],
    seerWolf: [
      "各位請仔細聽，我是明心觀察員。昨晚查驗 {t}，確認就是潛伏的酸民狼。{ctx}當斷不斷反受其亂，這輪請齊票出 {t}。",
      "既見破綻就不再隱瞞。我是本局明心觀察員，昨晚查證 {t} 是酸民狼無疑。{ctx}別被浮言帶偏，這輪集中投 {t}。",
      "直說重點：我是明心觀察員，昨晚查出 {t} 是酸民狼。{ctx}票型集中才不會失守，這輪請一起投 {t}。"
    ],
    seerGood: [
      "先立一個確切座標讓大家安心：我是明心觀察員，昨晚查過 {t} 是清白好人，千萬別誤傷；接著看 {next} 怎麼表態。",
      "我是明心觀察員，昨晚查驗 {t} 確認屬於好人陣營，可以先放善席；其餘迷霧，先聽 {next} 怎麼說。",
      "先跟各位交個底：我是明心觀察員，昨晚驗到 {t} 是可信夥伴。少一個疑點後，接下來細聽 {next} 是否言之成理。"
    ],
    fakeSeer: [
      "席間眾說紛紜，我必須出面正名。我才是真明心觀察員，昨晚親查 {t} 確認是酸民狼。大家別受蒙蔽，這輪集中投 {t}。",
      "是非不能顛倒，正牌明心觀察員在我這裡。昨晚已查明 {t} 是酸民狼，無須多繞，請大家集中票出 {t}。",
      "墨白不說虛話：我才是本局真明心觀察員，昨晚查到 {t} 是酸民狼無疑。請循理歸票投 {t}。"
    ],
    witchSave: [
      "我亮滴水奉茶師身分作證：前晚被迷霧鎖定的是 {t}，是我端暖心回甘茶護回來的，{t} 是鐵好人，千萬別誤投。",
      "補一條確切證據：我是滴水奉茶師，曾用暖心回甘茶救回 {t}。這席清白無庸置疑，請各位把目光移往別處。",
      "免得誤傷好人，我直接公開滴水奉茶師身分：前晚暖心回甘茶護回的是 {t}，請先把他移出狼坑。"
    ],
    wolfFirst: [
      "排第一位還沒人發言，照平常觀察，坐在後面的 {t} 聽完全場才開口最容易順勢藏身，待會大家細聽 {t} 的說詞。",
      "素箋未染還不好定調，不過後席 {t} 看完全局再發言最容易借勢混水，待會我會特別留意 {t} 的立場。",
      "首位沒前話可駁，我先記下後排的 {t}。壓軸位往往容易粉飾太平，等聽 {t} 待會怎麼講。"
    ],
    wolfSpoken: [
      "對照剛才幾位的說法，破綻已經昭然若揭。{t} 言辭閃爍又前後失衡，沒憑據就急著興風作浪，這輪我先投 {t}。",
      "細看 {t} 剛才那段發言，進退失據還急著定調，很像心虛掩飾。權衡再三，這輪應該先出 {t}。",
      "發言最忌虛浮，而 {t} 剛才空口扣帽子攪亂視聽，嫌疑最重。我這一票投給 {t}。"
    ],
    wolfWait: [
      "前面幾位說得還算工整，現在變數落在還沒開口的 {t} 身上。看他待會能不能言之成理，還是只會隨波附和。",
      "前段聽下來沒見到大破綻，我先把目光放在後席的 {t}，聽完他的發言再做定奪。",
      "前排各位都言之有物，反倒是壓軸的 {t} 深淺難測，稍後大家細聽 {t} 有沒有見風轉舵。"
    ],
    goodSus: [
      "把前面的發言對照來看，破綻已經昭然若揭。{t} 語氣急躁又屢屢空口挑動猜忌，欠缺求真之意，這輪我票投 {t}。",
      "綜觀前席各位的推論，就屬 {t} 脈絡斷裂最嚴重還避重就輕，理應優先請離。這輪我決定投 {t}。",
      "對照前後說法，{t} 既欠實證又急著催票，相當可疑。我保持理性，但這票必投 {t}。"
    ],
    goodAlly: [
      "剛才 {t} 說得條理分明、進退有度，全無挑撥私心，氣度頗像好人夥伴，先放好人席。{tail}",
      "細聽 {t} 的推論，脈絡貫通且持論公允，不像浮躁假牌，這輪我先保 {t}。{tail}",
      "論據紮實、語氣清正，{t} 算是席間清流，我暫時認 {t} 在好人陣營。{tail}"
    ],
    lastGood: "「可惜遭人誤投了。我確是清白好人，各位明天務必回頭檢視剛才合力推我的票型。」",
    lastWolf: "「各位確實明察秋毫，這局算得夠準。墨白技不如人，甘拜下風，先退席喝茶了。」"
  },
  "晴嵐": {
    bio: "大學國樂社古箏學姊（溫和書卷聽音派：自然現代白話帶溫雅氣質，偶爾點綴『弦外之音』『清濁分明』『聽話聽音』，從容柔和）",
    openFirst: [
      "茶煙正暖，就由晴嵐先起個頭吧。剛開局還聽不出什麼弦外之音，我先誠心報個好人身分，聽 {next} 接著聊聊。",
      "排在第一位像剛調好琴弦，線索還沒展開；我站穩好人立場，靜靜聽各位怎麼說，請 {next} 先開始。",
      "清茶微溫、山風很靜，首位沒前情可評。晴嵐先報清白，期待 {next} 帶出第一條線索。"
    ],
    seerWolf: [
      "大家先靜一靜，聽晴嵐說一句：我是明心觀察員，昨晚查了 {t}，發覺他語氣裡的雜音藏不住，確定是酸民狼。{ctx}為了茶席清朗，這輪請齊票投 {t}。",
      "本來不想打斷氣氛，但真假還是得說清——晴嵐就是明心觀察員，昨晚親驗 {t} 確定是酸民狼。{ctx}請大家同心投 {t}。",
      "直說吧，我是這局的明心觀察員，昨晚查到 {t} 確定是酸民狼。{ctx}別讓雜音亂了節奏，這輪集中出 {t}。"
    ],
    seerGood: [
      "先給大家送個安心消息：晴嵐是明心觀察員，昨晚查過 {t} 心思清正確定是好人，千萬別誤傷；接下來聽聽 {next} 怎麼看。",
      "晴嵐就不藏牌了，我是明心觀察員，昨晚驗過 {t} 屬於好人陣營，大家放心；下面靜聽 {next} 的想法。",
      "報一則好消息：我是明心觀察員，昨晚驗明 {t} 清白無瑕，先放好人席；接下來留心 {next} 的弦外之音。"
    ],
    fakeSeer: [
      "原本想再聽一輪，但假牌已經跳出來，晴嵐只得正名——我才是本局真明心觀察員。昨晚查過 {t} 確定是酸民狼，這輪請齊心投 {t}。",
      "大家別被亂音帶偏，真明心觀察員其實在我手上。昨晚親查 {t} 確定是酸民狼，穩住心神一起投 {t}。",
      "請聽晴嵐好好說清楚：真正的明心觀察員是我，昨晚一查就知道 {t} 是酸民狼，這輪集中票請離 {t}。"
    ],
    witchSave: [
      "容我補一條關鍵線索：晴嵐是這局滴水奉茶師，前晚被迷霧鎖定的是 {t}，是我端暖心回甘茶護回來的，他鐵定是好人，千萬別誤投。",
      "晴嵐亮出滴水奉茶師身分作證：前晚暖心回甘茶救回的人正是 {t}，可以安心信任，焦點轉去看其他席位吧。",
      "大家先緩一緩，我是滴水奉茶師，前晚親手用暖心回甘茶救了 {t}，有實證在就別再懷疑 {t} 了。"
    ],
    wolfFirst: [
      "第一個發言像獨奏起拍，還聽不到大家的回響；不過後排的 {t} 聽完全場才開口，最考驗真誠，待會我會細聽 {t} 的語氣。",
      "先拋個磚引玉吧，現在情報還淺，晴嵐會特別留意後排 {t} 待會會不會趁勢附和生波。",
      "開局還是一張白紙，我先記下壓軸位的 {t}，後手最容易順勢藏鋒，待會輪到 {t} 再細聽真假。"
    ],
    wolfSpoken: [
      "安靜聽完前面大家聊下來，唯有 {t} 藏著一股弦外之音、語氣微躁，急著引導猜忌卻欠缺求證，這票晴嵐先投 {t}。",
      "平心靜聽，剛才 {t} 那段推論顯得倉促生硬，和全場脈絡格格不入，像有意帶偏視聽，這輪先檢視 {t}。",
      "聽曲聽韻、聽話聽音——剛才 {t} 情緒轉折太刻意了，急著把矛頭推給別人，我這票先給 {t}。"
    ],
    wolfWait: [
      "前段幾位同學語氣都滿溫潤、條理也清楚；晴嵐比較在意還沒開口的 {t}，等聽完 {t} 表水再定奪。",
      "前面大家大致清朗自然，接下來留份心神給後席的 {t}，看他怎麼回應全場。",
      "前排夥伴詞氣都滿和氣的，只有還沒發聲的 {t} 還摸不準，聽完他怎麼說再歸票。"
    ],
    goodSus: [
      "細聽剛才一圈發言，唯有 {t} 弦外生躁、頻頻放大對立卻避談實據，很難讓人安心。為了護住茶席清朗，這票我投 {t}。",
      "對比前面幾位的說法，就屬 {t} 語氣最衝、前後銜接也牽強，這輪先請 {t} 離席喝茶冷靜一下吧。",
      "茶席貴在和氣求真，偏偏 {t} 剛才急著挑起分歧，晴嵐雖不想輕責同窗，這票還是決定投 {t}。"
    ],
    goodAlly: [
      "滿欣賞剛才 {t} 的發言，不疾不徐、清濁分明，沒有惡意猜忌，晴嵐先把 {t} 放好人席。{tail}",
      "聽 {t} 那段話覺得很舒服，視角澄明又顧念全場，晴嵐這輪願站邊 {t}。{tail}",
      "剛才 {t} 梳理脈絡細緻溫和，沒有造作感，是可信夥伴，我先保 {t}。{tail}"
    ],
    lastGood: "「這局還沒聽完就被誤投了…晴嵐真是清白好人，希望大家靜心細聽弦外之音，別被帶偏了。」",
    lastWolf: "「哎呀這根走音的弦還是被大家聽出來了，好耳力，那晴嵐甘願退席調琴喝茶去囉。」"
  },
  "阿朗": {
    bio: "辯論社犀利主辯（台灣辯論社男大生真實口語：反問犀利但不像唸稿，常講『欸等一下』『這證據在哪』『你這邏輯說不通啊』『先照證據投』）",
    openFirst: [
      "欸第一個輪到我喔，現在桌上還沒半點證據可以盤啦。我先亮明我是清白好人，後面大家講話記得拿出實際證據別打太極喔，換 {next} 申論，過。",
      "首發最單純啦，我站好人這邊，等一下大家把立論跟理由講清楚，我們再來交叉比對誰有漏洞，請 {next} 開始吧，過。",
      "我先開個頭吼，有證據講證據、別靠感覺亂扣帽子，目前還沒前情，接下來看 {next} 怎麼說囉，過。"
    ],
    seerWolf: [
      "欸大家直接聽關鍵證據喔，我就是這局真的明心觀察員，昨晚我去查了 {t}，確定就是酸民狼！{ctx}理由跟證據都擺在這了，這輪請大家集中投 {t}，過。",
      "不用再繞圈子了，我直接亮明心觀察員底牌：昨晚親手查了 {t} 就是酸民狼沒錯！{ctx}好人果斷歸票出 {t} 就對了，過。",
      "我直接把底牌攤開講喔，我是明心觀察員，昨晚查證 {t} 確定是酸民狼。{ctx}票別分散，這輪一起投 {t}，過。"
    ],
    seerGood: [
      "先幫大家確定一個證據喔，我是明心觀察員，昨晚查過 {t} 是清白好人，直接放好人坑就好。接下來我想重點質詢一下 {next} 的想法，過。",
      "我先公開昨晚的查驗，我是明心觀察員，{t} 確定是鐵好人喔！排除一個疑點之後，焦點看 {next} 待會怎麼說，過。",
      "給全場一個明確支點：我是真明心觀察員，昨晚驗過 {t} 百分百是好夥伴，接著換聽 {next} 怎麼盤囉，過。"
    ],
    fakeSeer: [
      "欸等一下，這我一定要提出異議了，我才是這桌真的明心觀察員好嗎！昨晚一查就抓到 {t} 是酸民狼，大家別被沒證據的話繞暈，這輪投 {t}，過。",
      "不是啊，正牌明心觀察員在我這邊耶，昨晚查驗 {t} 確定是酸民狼！誰硬幫他護航誰就很可疑喔，這輪先出 {t}，過。",
      "別被話術拐走了啦，真明心觀察員是我，昨晚查過 {t} 確定是酸民狼，好人站穩立場集中投 {t}，過。"
    ],
    witchSave: [
      "欸我補一個關鍵證據喔，我是這局滴水奉茶師，前晚親手端暖心回甘茶救回 {t} 的，所以 {t} 是好人這點完全不用懷疑，大家改查別人吧，過。",
      "這條線我直接幫大家鎖定：我是滴水奉茶師，暖心回甘茶救的就是 {t}！別在鐵好人身上浪費票喔，過。",
      "我出來提個現場實證，我是滴水奉茶師，救過 {t} 一命，他鐵定是好人，請大家轉去看其他可疑位置，過。"
    ],
    wolfFirst: [
      "第一個講雖然還沒人發言可以質詢啦，不過排後面的 {t} 聽完全場才講話，最容易順著風向偷換概念，待會大家盯緊 {t} 聽喔，過。",
      "開局還沒證據可對，但我先記下後排的 {t}，越晚講話越要看他拿不拿得出獨立證據，待會仔細聽，過。",
      "我先定個標準吼，前面還沒破綻，後面壓陣的 {t} 待會要是不敢明確表態就經不起追問囉，先過。"
    ],
    wolfSpoken: [
      "欸等一下，請問 {t} 你剛剛那套說法證據在哪啊？前後邏輯根本接不上還急著帶風向，這完全站不住腳吧，這輪我先投 {t}，過。",
      "不是啊，直接點破剛剛最大的漏洞喔，{t} 立場搖來搖去卻急著扣人帽子，這太像酸民狼的話術了，這輪我推 {t}，過。",
      "把剛剛的話攤開來質詢一下，{t} 重點問題全閃掉只會催大家投票，嫌疑真的太大了，這票我鎖定 {t}，過。"
    ],
    wolfWait: [
      "前面幾位講的立論還算完整啦，真正要質詢的是還沒開口的 {t}，待會聽他講不講得出實在證據，還是只會跟著附和，過。",
      "前段聽下來都還站得住腳，接下來全場看後面的 {t} 交不交得出合理的說法囉，過。",
      "前排夥伴基本沒什麼大漏洞，最大變數在還沒申論的 {t} 身上，等等聽他怎麼講，過。"
    ],
    goodSus: [
      "欸我提出異議喔，把前面大家的說法攤開比對，{t} 既拿不出實際證據又一直在偷換概念挑撥對立，這輪我建議直接投 {t}，過。",
      "老實說交叉比對下來，{t} 剛剛破綻最多而且答非所問，很明顯在轉移焦點，這輪大家集中把票壓給 {t} 吧，過。",
      "大家別被話術繞暈喔，剛剛 {t} 完全不敢正面回問題只靠情緒反咬，這種打法最危險了，這輪我投 {t}，過。"
    ],
    goodAlly: [
      "剛剛 {t} 那段講得很有證據跟條理耶，完全經得起追問，這輪我先挺 {t} 放好人坑。{tail}",
      "不錯喔，{t} 剛剛切中重點又沒亂扣帽子，這才是真好人的視角，我先認下 {t}！{tail}",
      "聽完 {t} 的立論覺得線條很清楚、沒有閃躲，這輪我先保 {t} 是好夥伴。{tail}"
    ],
    lastGood: "「欸這真的判錯了啦，我是清白好人耶！你們下輪回頭看剛剛誰一直閃避我的質詢，狼就在那邊！」",
    lastWolf: "「好啦漂亮，這局你們的證據抓得太準了，我完全沒辦法狡辯，認輸先退席冷靜囉！」"
  },
  "柚子": {
    bio: "點心社元氣學妹（台灣女大生可愛自然口語：語氣輕鬆親切、偶爾帶點甜點生活比喻，常說『咦…等一下喔』『怎麼聽起來空空的』『我覺得怪怪的耶』）",
    openFirst: [
      "嗨各位學長姊～輪到柚子第一個講話耶！剛開始還沒有線索可以猜啦，我先乖乖報個好人身分，大家等一下好好聊一起抓狼，換 {next} 講囉，過！",
      "哇第一個開麥好緊張喔…現在就像麵糰剛進烤箱還看不出變化啦，柚子絕對是純良的好夥伴，期待 {next} 待會怎麼說，先過。",
      "哈囉大家～首發真的沒東西盤耶，我先遞盤小餅乾給大家打打氣，我是好人喔，換 {next} 接棒聊吧，過！"
    ],
    seerWolf: [
      "欸各位學長姊快聽我說！其實柚子是這局的明心觀察員啦，昨晚我去查了 {t}，結果真的抓到他是酸民狼耶！{ctx}大家快團結起來，這輪一起投 {t} 喔！",
      "哇我不能再藏牌了，我是明心觀察員喔！昨晚查過 {t} 確定他就是藏在裡面的酸民狼！{ctx}拜託好夥伴們票別散掉，集中投 {t}，過！",
      "柚子直接講實話囉，我就是真明心觀察員，昨晚一查 {t} 果然是酸民狼！{ctx}為了茶席和平，這輪大家一起投 {t} 吧！"
    ],
    seerGood: [
      "跟大家報個甜甜的好消息喔～柚子其實是明心觀察員啦，昨晚查了 {t} 是超安心的好夥伴！請大家保護好他，等等聽聽 {next} 怎麼說，過。",
      "我是真的明心觀察員喔～昨晚先驗了 {t} 確定是清白好人，好人先牽起手別誤會他，下一棒看 {next} 囉，過！",
      "好消息跟大家說一下，我是明心觀察員，昨晚查過 {t} 百分百是好人喔！接下來換聽 {next} 怎麼盤吧，過。"
    ],
    fakeSeer: [
      "咦…等一下喔！大家別被前面騙走啦，我柚子才是這局真的明心觀察員耶！昨晚我查到 {t} 就是酸民狼，這輪快跟我一起投 {t} 吧！",
      "欸不對啦，真正的明心觀察員在我這邊喔！昨晚親手驗了 {t} 是酸民狼，大家快一起歸票投 {t} 囉，過！",
      "才不是前面講的那樣呢，真正拿到觀察員牌的是柚子啦！昨晚查出 {t} 是酸民狼，好夥伴們這輪請集中投 {t} 喔！"
    ],
    witchSave: [
      "欸我舉手講一下喔，柚子其實是滴水奉茶師啦～前晚看到 {t} 被迷霧鎖定，我趕快端暖心回甘茶把他救回來了，所以 {t} 百分百是好夥伴喔，過！",
      "我出來幫 {t} 作證喔！我是滴水奉茶師，暖心回甘茶就是給 {t} 喝的，大家千萬別投錯好人啦，過。",
      "這裡有很重要的線索喔，柚子是滴水奉茶師，之前親手救回 {t} 的，他是鐵好人，大家快改看其他人吧，過！"
    ],
    wolfFirst: [
      "第一個講話真的完全沒頭緒耶…不過我剛剛看坐在後排的 {t} 好像特別冷靜，待會輪到 {t} 大家記得仔細聽他怎麼說喔，過。",
      "先跟大家打個招呼～現在還沒人講話，我等一下想專心聽後面的 {t} 會不會只是順著別人的話跟著講，過！",
      "首發好難猜喔，但直覺告訴我後面的 {t} 很有戲耶，待會換他講話時大家記得認真聽細節喔，先過。"
    ],
    wolfSpoken: [
      "咦…等一下喔，剛剛聽 {t} 解釋半天，怎麼聽起來空空的像塌掉的舒芙蕾一樣沒重點呀，還偷偷帶大家情緒…這輪我先投 {t} 喔，過。",
      "怎麼辦，剛剛聽 {t} 講話又急又刺的，感覺怪怪的不太對勁耶…為了大家安心喝茶，我這輪先投 {t} 看看，過。",
      "唔…剛才 {t} 的口氣聽起來酸溜溜的，一直在催大家互相懷疑，我覺得超可疑的，這輪我先投 {t} 啦，過！"
    ],
    wolfWait: [
      "前面學長姊都講得好認真喔！接下來就看還沒發言的 {t} 囉，希望他等一下也能講出實實在在的理由，過。",
      "前排聽起來都很友善耶，那酸民狼說不定躲在還沒開口的 {t} 那邊喔，待會仔細聽，過！",
      "前面的分享聽著都滿舒服的，柚子現在最好奇還沒說話的 {t} 怎麼想，等等專心聽他講囉，過。"
    ],
    goodSus: [
      "咦…等一下喔，聽完一輪我覺得 {t} 剛剛講話空空的又有點帶刺，一直在故意讓大家起疑心耶，這輪柚子會先把票投給 {t} 喔，過。",
      "老實說我剛聽完覺得 {t} 怪怪的耶，前後講的兜不太起來還急著催票，這輪先請 {t} 去喝杯清茶冷靜一下好不好，過。",
      "雖然大家都想和和氣氣的，但剛剛 {t} 一直攪亂節奏最像狼了啦，為了保護好人我這輪先投 {t} 喔，過！"
    ],
    goodAlly: [
      "好喜歡剛剛 {t} 講話的感覺喔，溫和又有道理，聽起來就是可靠的好夥伴，柚子先挺 {t}！{tail}",
      "聽完 {t} 講的話覺得好安心喔，邏輯順順的又很有禮貌，我先把 {t} 放好人坑！{tail}",
      "剛剛 {t} 講得超實在又暖心，一點都沒有亂帶風向，柚子這輪先保 {t} 喔！{tail}"
    ],
    lastGood: "「嗚…怎麼把柚子投出去了啦，我真的是乖乖好夥伴耶！學長姊們下輪一定要把偷帶風向的狼抓出來喔！」",
    lastWolf: "「哎呀還是露餡被發現了哈哈～大家的眼睛真的好利喔，那柚子先去旁邊切蛋糕冷靜反省啦！」"
  }
};

// Per-persona signature cadence, rebuttal openers, signoffs & silent micro-reactions (attached to PERSONA_FLAVORS)
const PERSONA_VOICE_STYLES = {
  "小澄": {
    lead: ["欸我先順一下前面的時間點喔，", "照剛剛大家講的順序來看吼，", "我直接用刪去法順一遍，"],
    rebutLead: ["欸等一下，這指控前後兜不攏吧，", "不是啊，先把前因後果對清楚再說，"],
    dualLead: ["現在有兩個人跳明心觀察員嘛，我直接拆兩邊對一下狼坑，", "雙觀察員對跳用刪去法看最快，兩邊坑位這樣對，"],
    signoff: ["大概先講到這。", "先聽後面怎麼接。", ""],
    reactGasp: ["這哪裡對得上啊？", "先對一下時間點好嗎"],
    reactVouch: ["嗯，這點跟我想的一樣", "穩，照這條線走"],
    reactNod: ["這段講得滿順的", "有抓到重點喔"],
    reactDoubt: ["前後有點兜不攏耶…", "這句聽起來怪怪的"]
  },
  "暖暖": {
    lead: ["欸大家先喝口熱茶慢慢聊，", "大家別急著動氣嘛，我順一下剛剛聽到的，", "老實說我剛邊喝茶邊聽下來呀，"],
    rebutLead: ["咦…怎麼突然點到暖暖了啦，", "哎呀先別急著把暖暖推進狼坑嘛，"],
    dualLead: ["場上有兩位觀察員撞在一起耶，我們心平氣和把兩邊坑位看清楚，", "大家先別慌，我們慢慢把兩邊觀察員的狼坑攤開來比，"],
    signoff: ["大家和和氣氣投票喔。", "後面幾位也講講看吧。", ""],
    reactGasp: ["咦？怎麼會懷疑我…", "人家真的是好人啦…"],
    reactVouch: ["謝謝你相信暖暖～", "聽了好安心喔！"],
    reactNod: ["講得好溫和真誠喔", "嗯嗯我贊成！"],
    reactDoubt: ["口氣刺刺的有點怕…", "這句聽了心裡毛毛的"]
  },
  "阿松": {
    lead: ["欸老松講兩句實在話吼，", "聽老松看人的經驗順一遍，", "咱們別繞圈子，從頭順一下剛剛的風向，"],
    rebutLead: ["哈哈別鬧老松了啦，你看錯人了吧，", "喂喂這頂帽子扣太快了吧，"],
    dualLead: ["現在兩個人跳觀察員嘛，老松幫大家把兩條路算清楚，", "雙觀察員擺在檯面上，我們直接看兩邊狼坑合不合理，"],
    signoff: ["老松看法就是這樣。", "大家眼睛放亮一點。", ""],
    reactGasp: ["老兄你看走眼了吧？", "別亂推老實人啊！"],
    reactVouch: ["算你內行！夠義氣！", "正港好隊友啦！"],
    reactNod: ["這話實在中聽喔", "沒錯，就是這道理"],
    reactDoubt: ["講話霧濛濛的有鬼喔…", "老松不吃這套啦"]
  },
  "星兒": {
    lead: ["欸等一下喔，我剛聽下來很有感覺耶，", "老實說我直覺剛剛突然響了一下，", "我先講我剛聽完的第一直覺，"],
    rebutLead: ["蛤？等一下啦怎麼突然點我，", "欸不是吧，怎麼懷疑到星兒頭上啦，"],
    dualLead: ["哇兩個人跳明心觀察員耶，我直接把兩邊狼坑攤開對一下，", "雙觀察員撞牌超刺激的，我們看哪一邊比較自然，"],
    signoff: ["反正我直覺是這樣啦。", "你們後面怎麼看？", ""],
    reactGasp: ["蛤？太冤枉了吧！", "才不是我咧！"],
    reactVouch: ["耶你超懂我的！", "謝謝相信我啦！"],
    reactNod: ["對對對我也這樣想！", "直覺超準贊成！"],
    reactDoubt: ["聽完有點起雞皮疙瘩…", "這語氣怪怪的喔"]
  },
  "小雲": {
    lead: ["欸我剛邊聽邊記了一下重點，", "照我剛記下來的發言順序來看，", "我們直接對一下剛剛大家講的細節，"],
    rebutLead: ["欸慢著，你要踩我總要講根據吧，", "等一下，這波懷疑完全對不上事實，"],
    dualLead: ["現在兩位觀察員對跳嘛，我把剛記的兩邊狼坑攤開來比，", "雙觀察員衝突很好抓，我們直接核對兩邊的狼坑邏輯，"],
    signoff: ["細節我先記到這邊。", "後面聽完再對一次。", ""],
    reactGasp: ["欸你的根據在哪？", "別沒證據亂扣帽子喔"],
    reactVouch: ["沒錯，細節對得上！", "謝謝幫我講公道話"],
    reactNod: ["時間點完全對得上", "這段講得很實在"],
    reactDoubt: ["前後說詞有時間差喔…", "這邊明顯在閃重點"]
  },
  "阿竹": {
    lead: ["慢著，這杯凍頂茶還沒涼，我先理一理：", "細品前面幾番對答，端倪差不多出來了：", "聽其言觀其行，我先說說我的看法："],
    rebutLead: ["慢著慢著，這杯苦茶可潑錯人了——", "咦，這頂帽子扣得未免太急了吧——"],
    dualLead: ["席間同時有兩位明心觀察員，我把雙邊狼坑並列對照一下：", "茶湯清濁正好立判，我直接對比兩位觀察員的坑位："],
    signoff: ["茶還沒涼，先聽下位高見。", "點到為止，換後面聊。", ""],
    reactGasp: ["這可真是冤枉…", "潑錯茶湯囉！"],
    reactVouch: ["知音難尋！", "謝同窗仗義執言！"],
    reactNod: ["說得在理！", "清風明辨！"],
    reactDoubt: ["茶味微澀有蹊蹺…", "詞鋒略顯急躁"]
  },
  "晨晨": {
    lead: ["欸兄弟們聽我講兩句，", "老實講剛剛聽下來破綻滿明顯的耶，", "我直接講重點不拐彎抹角，"],
    rebutLead: ["喂不是吧，怎麼突然踩到自己人頭上啦，", "欸等一下這鍋我不背喔，"],
    dualLead: ["現在兩個人搶明心觀察員嘛，我直接拆兩邊狼坑給大家看，", "雙觀察員對決很清楚啊，我們直接比兩邊誰合理，"],
    signoff: ["我就直說到這邊啦。", "換後位接棒聊聊。", ""],
    reactGasp: ["喂看清楚再踩啦！", "別誤傷隊友啊！"],
    reactVouch: ["謝啦好兄弟！", "夠義氣懂我！"],
    reactNod: ["講得超乾脆贊同！", "沒錯就是這樣！"],
    reactDoubt: ["講話一直閃喔…", "這破綻有點大耶"]
  },
  "墨白": {
    lead: ["對照前面幾位的說法，脈絡漸明了：", "把剛才的發言順一遍，是非其實很清楚：", "我直接說結論："],
    rebutLead: ["慢著，這指控毫無實據——", "下定論之前，先把憑據拿出來——"],
    dualLead: ["場上雙現明心觀察員，我直接用排除法對照兩邊狼坑：", "既然對跳，就該權衡兩端坑位辨明真偽："],
    signoff: ["點到為止。", "看法如上，聽後位怎麼說。", ""],
    reactGasp: ["無憑妄斷。", "切莫顛倒黑白。"],
    reactVouch: ["所見略同。", "多謝明辨。"],
    reactNod: ["條理分明。", "持論公允。"],
    reactDoubt: ["前後失衡…", "語氣略顯虛浮"]
  },
  "晴嵐": {
    lead: ["靜靜聽完大家剛才聊的，晴嵐試著理一下：", "順著前面幾位的語氣聽下來：", "我輕輕幫大家把脈絡順一遍："],
    rebutLead: ["咦，怎麼話題突然轉到我身上了——", "大家先別急，聽晴嵐慢慢澄清——"],
    dualLead: ["兩位明心觀察員各有說法，我把雙邊狼坑攤開細看：", "雙邊對跳最忌心亂，晴嵐把兩條線並列給大家參考："],
    signoff: ["以上供大家參考。", "接著聽後面幾位怎麼說吧。", ""],
    reactGasp: ["咦，怕是聽錯意思了？", "晴嵐清白可辨呀"],
    reactVouch: ["謝謝同窗相護～", "有人懂這段真好！"],
    reactNod: ["言辭溫雅有理", "語氣清正誠懇"],
    reactDoubt: ["弦外略顯急躁…", "這段聽起來有點走調"]
  },
  "阿朗": {
    lead: ["欸我直接抓剛剛最核心的爭點，", "我們把前面的證據跟邏輯攤開來看，", "先順一下剛剛幾位的說法哪裡有矛盾，"],
    rebutLead: ["欸等一下我提出異議，這指控根本站不住腳啊，", "你要懷疑我總要先拿出證據吧，"],
    dualLead: ["現在兩張觀察員正面撞上嘛，我們直接並排比對兩邊狼坑的證據，", "雙觀察員對跳看誰邏輯有漏洞最準，兩邊這樣比，"],
    signoff: ["照證據跟邏輯投就好。", "你待會記得回應這個爭點。", ""],
    reactGasp: ["異議！這推論不通吧！", "請先拿出證據好嗎！"],
    reactVouch: ["沒錯，邏輯對上了！", "謝謝理性分析！"],
    reactNod: ["這段推論很紮實", "切中重點了！"],
    reactDoubt: ["這邊在偷換概念喔…", "完全沒回核心問題耶"]
  },
  "柚子": {
    lead: ["咦…我剛邊聽邊想了一下，", "跟大家分享一下柚子剛聽到的感覺，", "欸我先說我剛聽完的想法，"],
    rebutLead: ["咦？怎麼突然懷疑到柚子頭上啦，", "等一下喔，才不是我呢，聽我解釋啦，"],
    dualLead: ["哇兩位觀察員撞在一起了耶，我們把兩邊狼坑擺出來比比看，", "雙觀察員好難選喔，不過兩邊坑位攤開看就清楚多了，"],
    signoff: ["那換下一位接著講囉。", "大概就是這樣啦。", ""],
    reactGasp: ["咦～太冤枉了啦！", "才不是柚子呢！"],
    reactVouch: ["耶謝謝學長姊相信我！", "聽了好開心喔～"],
    reactNod: ["講得好清楚喔贊成！", "嗯嗯我也這樣覺得！"],
    reactDoubt: ["怎麼聽起來空空的…", "這句感覺怪怪的耶"]
  }
};
Object.keys(PERSONA_VOICE_STYLES).forEach(function (k) {
  if (PERSONA_FLAVORS[k]) PERSONA_FLAVORS[k].voiceStyle = PERSONA_VOICE_STYLES[k];
});

const TOXIC_PATTERNS = [
  { word: "白癡", weight: 35 }, { word: "笨蛋", weight: 30 }, { word: "智障", weight: 40 },
  { word: "閉嘴", weight: 30 }, { word: "去死", weight: 45 }, { word: "廢物", weight: 35 },
  { word: "垃圾", weight: 35 }, { word: "滾", weight: 28 }, { word: "腦殘", weight: 40 },
  { word: "亂玩", weight: 22 }, { word: "瞎子", weight: 30 }, { word: "蠢", weight: 25 },
  { word: "好了啦", weight: 18 }, { word: "下去吧", weight: 20 }, { word: "笑死", weight: 18 },
  { word: "邏輯死亡", weight: 24 }, { word: "少裝了", weight: 22 }, { word: "別演了", weight: 22 },
  { word: "根本在演", weight: 22 }, { word: "胡說八道", weight: 24 }
];

const KIND_PATTERNS = [
  "請教", "觀察", "建議", "謝謝", "一起", "線索", "邏輯", "保護", "相信", "大家", "溫和", "好人", "夥伴", "冷靜", "奉茶"
];
