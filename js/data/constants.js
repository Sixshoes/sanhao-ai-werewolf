/**
 * 遊戲靜態常數：Gemini 端點、新手教學卡片、山城書院角色定義、AI 策略劇本、8 位書院夥伴人設與三好詞典
 */
"use strict";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// v24.2.13 Concise Editorial 6-Chapter Device Manuals (Phone / Tablet / Desktop — zero emojis, readable >= 13.5px)
const DEVICE_TUTORIAL_META = {
  phone: {
    key: "phone",
    label: "手機教學",
    shortTitle: "手機單手指南",
    banner: "橫滑選座、長按開輪盤、單手點牌即可完成整局。"
  },
  tablet: {
    key: "tablet",
    label: "平板教學",
    shortTitle: "平板雙手指南",
    banner: "左手掌指南表態、右手推進四給，頭像拖線直覺落籌。"
  },
  desktop: {
    key: "desktop",
    label: "電腦教學",
    shortTitle: "電腦鍵鼠指南",
    banner: "滑鼠拖曳連線、滾輪自由運鏡，搭配單鍵熱鍵暢快盤局。"
  }
};

const _TUT_ROLES_SHARED_HTML =
  '<div class="ed-section-label text-emerald-300">基礎四職（6 人局）</div>' +
  '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
  '<div class="tut-role-item"><span class="tut-role-badge text-amber-300">明心觀察員</span><span>每晚查驗 1 人正邪，白天公開線索帶隊。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-emerald-300">滴水奉茶師</span><span>回甘茶救人、清心茶請離，各 1 次且同夜限用一盞。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-slate-200">三好書院生</span><span>無夜間技，靠聽發言與比對票型揪出破綻。</span></div>' +
  '<div class="tut-role-item tut-role-wolf"><span class="tut-role-badge text-rose-300">鍵盤酸民狼</span><span>夜襲請離好人，白天偽裝清白帶動風向。</span></div>' +
  '</div>' +
  '<div class="ed-section-label text-sky-300 pt-1">進階四職（8～12 人局）</div>' +
  '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
  '<div class="tut-role-item"><span class="tut-role-badge text-sky-300">直心糾察長</span><span>離席可帶走 1 人（遭清心茶或屠神夜襲除外）。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-cyan-300">護心守衛</span><span>每晚守 1 人擋霧（禁連守，同守同救破盾）。</span></div>' +
  '<div class="tut-role-item"><span class="tut-role-badge text-teal-300">清心長老</span><span>首遭公投誤投亮牌豁免，後續失票但可發言帶隊。</span></div>' +
  '<div class="tut-role-item tut-role-wolf"><span class="tut-role-badge text-rose-200">流言首領</span><span>白天遭公投離席時，反撲帶走 1 人（無遺言）。</span></div>' +
  '</div>';

const _TUT_FOURG_SHARED_HTML =
  '<div class="tut-card tut-tone-good space-y-2">' +
  '<div class="tut-card-title text-emerald-300">三好蓮花・三瓣覺醒</div>' +
  '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">' +
  '<div class="tut-step-pill"><strong class="text-amber-300">存好心</strong><div class="opacity-85">查證線索、指出矛盾</div></div>' +
  '<div class="tut-step-pill"><strong class="text-emerald-300">說好話</strong><div class="opacity-85">溫潤陳詞、化解對立</div></div>' +
  '<div class="tut-step-pill"><strong class="text-sky-300">做好事</strong><div class="opacity-85">奉茶結緣、守護夥伴</div></div>' +
  '</div>' +
  '<div class="ed-sub-note">三瓣全亮：好人獲得<strong>黃金善意票（+1 票）</strong>；狼方降低全場戒心。</div>' +
  '</div>' +
  '<div class="tut-card tut-tone-gold space-y-1.5">' +
  '<div class="tut-card-title text-amber-300">四給茶禮（各限用一次）</div>' +
  '<dl class="ed-kv-list ed-kv-two">' +
  '<div class="ed-kv-row"><dt>給信心</dt><dd>隱密替 1 位夥伴擋下 1 票</dd></div>' +
  '<div class="ed-kv-row"><dt>給歡喜</dt><dd>破冰點出 2 位神色緊繃席次</dd></div>' +
  '<div class="ed-kv-row"><dt>給希望</dt><dd>雙席 15 秒對質比對言票矛盾</dd></div>' +
  '<div class="ed-kv-row"><dt>給方便</dt><dd>展開關係脈絡、號召歸票</dd></div>' +
  '</dl>' +
  '</div>';

const DEVICE_TUTORIAL_DECKS = {
  phone: [
    {
      icon: "01",
      tab: "基本規則",
      title: "手機直握：三階段掌握全局",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-tip-bar">上方為 <strong>3D 茶席</strong>、下方為<strong>單手操控區</strong>，免打字即可完成推理。</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">好人陣營</div><div class="tut-card-body">比對發言與票型，<strong>公投請離全部酸民狼</strong>即勝。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">酸民狼陣營</div><div class="tut-card-body">夜襲令好人離席、白天偽裝；<strong>屠神或屠民</strong>即勝。</div></div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">每輪三階段</div>' +
        '<div class="grid grid-cols-3 gap-1.5 text-center">' +
        '<div class="tut-step-pill"><div class="font-bold text-indigo-300">壹 · 入夜</div><div class="opacity-85">點選底部座位<br />施展夜技</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-amber-300">貳 · 白天</div><div class="opacity-85">拇指推進聽盤<br />一鍵點牌發聲</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-rose-300">參 · 公投</div><div class="opacity-85">鎖定可疑席次<br />高票請離</div></div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar">帶虛線底線的術語（如金水、悍跳、歸票），輕點即看白話釋義。</div>' +
        '</div>'
    },
    {
      icon: "02",
      tab: "角色職能",
      title: "茶席八大職能速查",
      html:
        '<div class="space-y-2.5 text-left">' +
        _TUT_ROLES_SHARED_HTML +
        '<div class="tut-tip-bar">點左下<strong>「指南」</strong>隨時看下一步；旁有人時點<strong>「遮蔽」</strong>隱藏底牌。</div>' +
        '</div>'
    },
    {
      icon: "03",
      tab: "單手操作",
      title: "手機單手觸控與長按輪盤",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-demo-rail"><span class="tut-mini-seat">01</span><span class="tut-mini-seat">02</span><span class="tut-mini-seat is-target-seat">03</span><span class="tut-mini-seat">04</span><span class="tut-swipe-thumb"></span></div></div>' +
        '<div class="tut-anim-caption">橫滑座位條 · 輕觸選席</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-hold-center">03<span class="tut-hold-ring"></span><span class="tut-hold-orb is-o1"></span><span class="tut-hold-orb is-o2"></span><span class="tut-hold-orb is-o3"></span><span class="tut-hold-orb is-o4"></span></div></div>' +
        '<div class="tut-anim-caption">長按 0.5 秒 · 綻開偵探輪盤</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">單手核心手勢</div>' +
        '<dl class="ed-kv-list">' +
        '<div class="ed-kv-row"><dt>橫滑座位條</dt><dd>輕觸看情資，連點同一席兩下立即定案防誤觸。</dd></div>' +
        '<div class="ed-kv-row"><dt>長按開輪盤</dt><dd>聽盤長按任一席 0.5 秒，標記好人、存疑或觀微。</dd></div>' +
        '<div class="ed-kv-row"><dt>一鍵點牌</dt><dd>輪到你時直選三張策略牌發聲，或點「改詞」微調。</dd></div>' +
        '</dl>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">聽盤表態</div><div class="tut-card-body">點認同、存疑或追問，再按<strong>下一位</strong>推進。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">身為酸民狼</div><div class="tut-card-body">夜裡屏風配戰術；危急可選「拂袖掀席」自爆。</div></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "04",
      tab: "三好四給",
      title: "三好蓮花與四給茶禮",
      html:
        '<div class="space-y-2.5 text-left">' +
        _TUT_FOURG_SHARED_HTML +
        '<div class="tut-tip-bar">手機版左下放<strong>身分與蓮花</strong>、右下收合<strong>四給奉茶</strong>，展開施放後自動收合。</div>' +
        '</div>'
    },
    {
      icon: "05",
      tab: "手勢與省電",
      title: "觸控運鏡與省電建議",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-pinch-wrap"><span class="tut-pinch-dot is-l"></span><span class="tut-pinch-dot is-r"></span></div></div>' +
        '<div class="tut-anim-caption">雙指開合 · 縮放茶席</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-fan-wrap"><span class="tut-fan-slip is-s1">信</span><span class="tut-fan-slip is-s2">喜</span><span class="tut-fan-slip is-s3">望</span><span class="tut-fan-slip is-s4">便</span></div></div>' +
        '<div class="tut-anim-caption">四給奉茶 · 隨用隨收</div>' +
        '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral"><div class="tut-card-title text-amber-300 mb-1">運鏡手勢</div><dl class="ed-kv-list"><div class="ed-kv-row"><dt>單指滑動</dt><dd>360° 環視茶席</dd></div><div class="ed-kv-row"><dt>雙指開合</dt><dd>縮放鏡頭焦距</dd></div><div class="ed-kv-row"><dt>雙擊空地</dt><dd>立即回正視角</dd></div></dl></div>' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300 mb-1">流暢省電</div><dl class="ed-kv-list"><div class="ed-kv-row"><dt>四種視角</dt><dd>運鏡／坐席／俯瞰／2D</dd></div><div class="ed-kv-row"><dt>省電模式</dt><dd>低電量建議切 2D 圓桌</dd></div><div class="ed-kv-row"><dt>倍速切換</dt><dd>頂列隨時調語音速度</dd></div></dl></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "06",
      tab: "手機入席",
      title: "新手開局建議",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300 mb-1">推薦先玩「新手帶玩席」</div><div class="tut-card-body">6 人基礎席（明心觀察員）附首輪導引，約 5 分鐘即可熟悉全流程。</div></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral"><div class="tut-card-title text-amber-300">通勤靜音模式</div><div class="tut-card-body">右上選單一鍵靜音快讀，離席後仍可參與「茶靈押注」。</div></div>' +
        '<div class="tut-card tut-tone-gold"><div class="tut-card-title text-amber-300">免登入直接玩</div><div class="tut-card-body">開箱即可離線對弈，亦可於選單隨時切換雲端或自備模型。</div></div>' +
        '</div>' +
        '<div class="tut-tip-bar text-center">點右下角<strong>「開啟新手帶玩席」</strong>立即單手入座。</div>' +
        '</div>'
    }
  ],

  tablet: [
    {
      icon: "01",
      tab: "基本規則",
      title: "平板全景：三階段推理",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-tip-bar">上方呈現<strong>3D 茶席全景</strong>、下方配置雙手操控區，點牌或拖線即可投入推理。</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">好人陣營</div><div class="tut-card-body">比對發言與投票紀錄，<strong>公投請離全部酸民狼</strong>即勝。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">酸民狼陣營</div><div class="tut-card-body">入夜暗襲、白天混淆視聽；<strong>屠神或屠民</strong>即勝。</div></div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">每輪三階段</div>' +
        '<div class="grid grid-cols-3 gap-1.5 text-center">' +
        '<div class="tut-step-pill"><div class="font-bold text-indigo-300">壹 · 入夜</div><div class="opacity-85">點選或拖線<br />施展夜技</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-amber-300">貳 · 白天</div><div class="opacity-85">三卡並排<br />一鍵發聲</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-rose-300">參 · 公投</div><div class="opacity-85">頭像拖線落籌<br />高票請離</div></div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar">帶虛線底線的術語（如金水、悍跳、歸票），輕點即看白話釋義。</div>' +
        '</div>'
    },
    {
      icon: "02",
      tab: "角色職能",
      title: "茶席八大職能速查",
      html:
        '<div class="space-y-2.5 text-left">' +
        _TUT_ROLES_SHARED_HTML +
        '<div class="tut-tip-bar">點左下<strong>「指南」</strong>浮動查看密令；多人共看平板時可點<strong>「遮蔽」</strong>護底牌。</div>' +
        '</div>'
    },
    {
      icon: "03",
      tab: "雙手與拖線",
      title: "平板雙手分區與頭像拖曳連線",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-beam-row"><span class="tut-beam-node">你</span><span class="tut-beam-line"></span><span class="tut-beam-node is-dst">04</span></div></div>' +
        '<div class="tut-anim-caption">頭像拖曳連線 · 放手即落籌</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-twohand-box"><span class="tut-hand-zone">左手 · 指南表態</span><span class="tut-hand-zone is-right">右手 · 推進四給</span></div></div>' +
        '<div class="tut-anim-caption">雙手自然分工 · 零遮擋</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">平板觸控節奏</div>' +
        '<dl class="ed-kv-list">' +
        '<div class="ed-kv-row"><dt>雙手分工</dt><dd>左手掌指南與表態，右手控下一位、四給與手札。</dd></div>' +
        '<div class="ed-kv-row"><dt>頭像拖曳連線</dt><dd>公投或入夜按住自己頭像拖向目標，放手即完成動作。</dd></div>' +
        '<div class="ed-kv-row"><dt>偵探輪盤</dt><dd>聽盤時對他席拖線或長按 0.5 秒，快速標記與觀微。</dd></div>' +
        '</dl>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">茶席手札</div><div class="tut-card-body">雙欄檢視全席發言與歷輪票型，盤坑更清晰。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">身為酸民狼</div><div class="tut-card-body">夜裡下達戰術；白天危急可選「拂袖掀席」自爆。</div></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "04",
      tab: "三好四給",
      title: "三好蓮花與四給茶禮",
      html:
        '<div class="space-y-2.5 text-left">' +
        _TUT_FOURG_SHARED_HTML +
        '<div class="tut-tip-bar">橫持常駐左右底角；直持對稱置於字幕下方，雙手操作零遮擋。</div>' +
        '</div>'
    },
    {
      icon: "05",
      tab: "運鏡與橫直",
      title: "觸控運鏡與橫直自適應",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral"><div class="tut-card-title text-amber-300 mb-1">觸控運鏡</div><dl class="ed-kv-list"><div class="ed-kv-row"><dt>單指拖曳</dt><dd>360° 環視茶席</dd></div><div class="ed-kv-row"><dt>雙指開合</dt><dd>自由縮放焦距</dd></div><div class="ed-kv-row"><dt>雙擊角色</dt><dd>特寫並開情資卡</dd></div></dl></div>' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300 mb-1">橫直與鍵盤</div><dl class="ed-kv-list"><div class="ed-kv-row"><dt>橫向推薦</dt><dd>三欄劇院容納 12 人大席</dd></div><div class="ed-kv-row"><dt>直向閱讀</dt><dd>寬幅字幕配雙欄工具</dd></div><div class="ed-kv-row"><dt>外接鍵盤</dt><dd>支援 Space / J / C 快捷鍵</dd></div></dl></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "06",
      tab: "平板入席",
      title: "平板開局建議",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300 mb-1">新手席 → 橫持 8～12 人大局</div><div class="tut-card-body">先以 6 人帶玩席熟悉節奏，再橫持挑戰守衛、長老與警長歸票制。</div></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral"><div class="tut-card-title text-amber-300">多人共賞</div><div class="tut-card-body">搭配「評審導覽」或「遮蔽」底牌，方便同桌討論排坑。</div></div>' +
        '<div class="tut-card tut-tone-gold"><div class="tut-card-title text-amber-300">離線與雲端</div><div class="tut-card-body">內建離線 AI 免設定即玩，亦可於選單切換 Gemini 模型。</div></div>' +
        '</div>' +
        '<div class="tut-tip-bar text-center">點右下角<strong>「開啟新手帶玩席」</strong>立即展開對弈。</div>' +
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
        '<div class="tut-tip-bar">每晚有人暗中滋事，天亮後聽盤找破綻，<strong>投票請他離席</strong>。免打字，滑鼠加單鍵熱鍵即可暢快推理。</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">好人陣營</div><div class="tut-card-body">比對發言與票型，<strong>公投請離全部酸民狼</strong>即勝。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">酸民狼陣營</div><div class="tut-card-body">夜襲令好人離席、白天偽裝；<strong>屠神或屠民</strong>即勝。</div></div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">每輪三階段</div>' +
        '<div class="grid grid-cols-3 gap-1.5 text-center">' +
        '<div class="tut-step-pill"><div class="font-bold text-indigo-300">壹 · 入夜</div><div class="opacity-85">神職狼方行動<br />書院生靜息</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-amber-300">貳 · 白天</div><div class="opacity-85">Space 聽盤<br />Q/W/E 點牌</div></div>' +
        '<div class="tut-step-pill"><div class="font-bold text-rose-300">參 · 公投</div><div class="opacity-85">拖線或數字鍵<br />高票請離</div></div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-tip-bar">帶虛線底線的術語（如金水、悍跳、歸票），滑鼠移上即看白話釋義。</div>' +
        '</div>'
    },
    {
      icon: "02",
      tab: "角色職能",
      title: "茶席八大職能速查",
      html:
        '<div class="space-y-2.5 text-left">' +
        _TUT_ROLES_SHARED_HTML +
        '<div class="tut-tip-bar">隨時點左下<strong>「指南」</strong>查密令；投影共看時可點<strong>「遮蔽」</strong>隱藏底牌。</div>' +
        '</div>'
    },
    {
      icon: "03",
      tab: "滑鼠互動",
      title: "滑鼠拖曳連線與茶席彩蛋",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-anim-stage" aria-hidden="true">' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-beam-row"><span class="tut-beam-node">你</span><span class="tut-beam-line"></span><span class="tut-beam-node is-dst">04</span></div></div>' +
        '<div class="tut-anim-caption">拖曳頭像連線 · 一筆落籌查證</div>' +
        '</div>' +
        '<div class="tut-anim-card">' +
        '<div class="tut-anim-canvas"><div class="tut-fan-wrap"><span class="tut-fan-slip is-s1">信</span><span class="tut-fan-slip is-s2">喜</span><span class="tut-fan-slip is-s3">望</span><span class="tut-fan-slip is-s4">便</span></div></div>' +
        '<div class="tut-anim-caption">懸停展開四給奉茶 · 隨選隨施</div>' +
        '</div>' +
        '</div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-amber-300 mb-1.5">滑鼠核心互動方式</div>' +
        '<dl class="ed-kv-list">' +
        '<div class="ed-kv-row"><dt>點選與連點</dt><dd>單擊看情資，入夜或公投連點同一席兩下立即定案。</dd></div>' +
        '<div class="ed-kv-row"><dt>拖曳連線</dt><dd>自頭像拖向目標落籌或查驗；聽盤拖線開偵探輪盤。</dd></div>' +
        '<div class="ed-kv-row"><dt>特寫與彩蛋</dt><dd>雙擊角色推近特寫；點桌心蓮花、燭火或清茗皆有互動。</dd></div>' +
        '</dl>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300">身為好人</div><div class="tut-card-body">按 <kbd class="ui-kbd">J</kbd> 開茶席手札對照票型與言行矛盾。</div></div>' +
        '<div class="tut-card tut-tone-wolf"><div class="tut-card-title text-rose-300">身為酸民狼</div><div class="tut-card-body">入夜指揮狼隊戰術；白天危急可選「拂袖掀席」自爆。</div></div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "04",
      tab: "三好四給",
      title: "三好蓮花與四給茶禮",
      html:
        '<div class="space-y-2.5 text-left">' +
        _TUT_FOURG_SHARED_HTML +
        '</div>'
    },
    {
      icon: "05",
      tab: "熱鍵與運鏡",
      title: "鍵盤熱鍵與四種機位",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-anim-card" aria-hidden="true">' +
        '<div class="tut-anim-canvas"><div class="tut-key-row"><span class="tut-anim-key">Space</span><span class="tut-anim-key">Q / W / E</span><span class="tut-anim-key">Enter</span><span class="tut-anim-key">J</span><span class="tut-anim-key">C</span></div></div>' +
        '<div class="tut-anim-caption">單鍵節奏 · 聽盤、出牌、落籌、手札流暢銜接</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral"><div class="tut-card-title text-amber-300 mb-1">滑鼠運鏡與機位</div><dl class="ed-kv-list"><div class="ed-kv-row"><dt>拖曳／滾輪</dt><dd>360° 環視與縮放；雙擊或 <kbd class="ui-kbd">R</kbd> 回正。</dd></div><div class="ed-kv-row"><dt>切換機位</dt><dd><kbd class="ui-kbd">C</kbd> 輪切運鏡、坐席、俯瞰、2D。</dd></div><div class="ed-kv-row"><dt>偷看底牌</dt><dd><kbd class="ui-kbd">F</kbd> 翻閱桌面身分牌。</dd></div></dl></div>' +
        '<div class="tut-card tut-tone-neutral">' +
        '<div class="tut-card-title text-sky-300 mb-1">常用快捷鍵</div>' +
        '<div class="tut-kbd-grid">' +
        '<span><kbd class="ui-kbd">Space</kbd> 下一位</span>' +
        '<span><kbd class="ui-kbd">Enter</kbd> 確認</span>' +
        '<span><kbd class="ui-kbd">Q / W / E</kbd> 出牌</span>' +
        '<span><kbd class="ui-kbd">Tab</kbd> 換目標</span>' +
        '<span><kbd class="ui-kbd">1-0/-/=</kbd> 選席</span>' +
        '<span><kbd class="ui-kbd">J</kbd> 手札</span>' +
        '<span><kbd class="ui-kbd">C / R</kbd> 機位／回正</span>' +
        '<span><kbd class="ui-kbd">P / V / M</kbd> 暫停／音</span>' +
        '<span><kbd class="ui-kbd">A</kbd> 自動</span>' +
        '<span><kbd class="ui-kbd">Esc</kbd> 選單</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>'
    },
    {
      icon: "06",
      tab: "電腦入席",
      title: "電腦開局建議",
      html:
        '<div class="space-y-2.5 text-left">' +
        '<div class="tut-card tut-tone-good"><div class="tut-card-title text-emerald-300 mb-1">新手帶玩席 → 10／12 人進階大局</div><div class="tut-card-body">先跑 6 人帶玩席熟悉節奏，再於自訂茶席開啟警長制與護心守衛。</div></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div class="tut-card tut-tone-neutral"><div class="tut-card-title text-amber-300">離席觀戰</div><div class="tut-card-body">續留觀戰可參與每輪「茶靈押注」與猜狼挑戰。</div></div>' +
        '<div class="tut-card tut-tone-gold"><div class="tut-card-title text-amber-300">多引擎切換</div><div class="tut-card-body">開箱即玩，亦可於選單切換雲端、自備金鑰或本機 Ollama。</div></div>' +
        '</div>' +
        '<div class="tut-tip-bar text-center">點右下角<strong>「開啟新手帶玩席」</strong>立即入座（方向鍵可翻章）。</div>' +
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

// ==================== V24.2.13 CONCISE PER-ROLE PLAYBOOK ====================
const ROLE_GUIDES = {
  seer: {
    icon: "",
    iconKey: "seer",
    themeClass: "role-theme-seer",
    shortRole: "神職・查驗核心",
    cardOneLiner: "每晚可偷看 1 個人是不是酸民狼",
    cardNight: "查驗 1 席，立刻得知好人或酸民狼",
    cardDay: "報出查驗與預告今晚去向，拆穿假跳",
    cardVote: "帶領好人公投請離全部酸民狼",
    winCond: "與好夥伴公投請離所有酸民狼",
    nightAction: "每晚查驗 1 位在席夥伴，得知真實立場。",
    dayAction: "亮牌報查驗並留警徽流，遇對跳果斷拆穿並歸票。",
    threeGoodTip: "公開查證、溫和歸票，最快點亮三好蓮花取得 +1 善意票。"
  },
  witch: {
    icon: "",
    iconKey: "witch",
    themeClass: "role-theme-witch",
    shortRole: "神職・雙茶救贖",
    cardOneLiner: "手握「回甘救人」與「清心請離」雙茶",
    cardNight: "擇一用回甘茶救人，或清心茶請離可疑席",
    cardDay: "先低調聽盤，關鍵時刻亮牌替銀水作證",
    cardVote: "穩住輪次，公投請離全部酸民狼",
    winCond: "守住神職與輪次，公投出全部酸民狼",
    nightAction: "回甘茶救人（次夜禁自救）、清心茶請離，同夜限用一盞。",
    dayAction: "前期低調防夜襲，銀水受冤或定錨時再亮牌作證。",
    threeGoodTip: "善用回甘茶護伴與白天奉茶，快速累積「做好事」瓣。"
  },
  hunter: {
    icon: "",
    iconKey: "scales",
    themeClass: "role-theme-hunter",
    shortRole: "神職・正氣威懾",
    cardOneLiner: "離席瞬間可帶走 1 人的正氣好人",
    cardNight: "夜間靜息，無主動夜技",
    cardDay: "細聽發言，記下最可疑的破綻席次",
    cardVote: "遭淘汰時精準帶走頭號狼嫌",
    winCond: "穩住好人陣線，離席時精準帶走酸民狼",
    nightAction: "夜間靜息，專注記下日間發言與票型破綻。",
    dayAction: "平時低調排坑；遭推抗推可亮牌威懾，離席（非清心茶／非屠神）開槍帶人。",
    threeGoodTip: "理性陳詞不急躁，贏得信任並於危急時一擊翻盤。"
  },
  guard: {
    icon: "",
    iconKey: "guard",
    themeClass: "role-theme-guard",
    shortRole: "神職・結界守護",
    cardOneLiner: "每晚為 1 席展開護心結界擋下夜襲",
    cardNight: "選 1 席守護（可自守、禁連守同人）",
    cardDay: "低調聽盤，暗中護住真神職",
    cardVote: "攜手好人公投請離全部酸民狼",
    winCond: "護住關鍵神職，拉開好人輪次優勢",
    nightAction: "每晚守 1 人擋下迷霧；禁連守同人，同守同救會破盾。",
    dayAction: "低調藏身並留意奉茶師是否用救藥，必要時公開守線自證。",
    threeGoodTip: "默默護伴即「做好事」，搭配【給信心】雙重守住核心。"
  },
  elder: {
    icon: "",
    iconKey: "elder",
    themeClass: "role-theme-elder",
    shortRole: "進階好人・豁免定海針",
    cardOneLiner: "首次遭公投誤投可亮牌豁免離席",
    cardNight: "夜間靜息，無主動夜技",
    cardDay: "替誠懇夥伴發聲，為神職分擔火力",
    cardVote: "豁免後雖無投票權，仍可發言歸票",
    winCond: "善用首輪豁免護盾，穩健帶領好人抓狼",
    nightAction: "夜間靜息，白天交叉比對立場與票型。",
    dayAction: "首遭公投誤投自動亮牌免離席（後續失票但保留發言權帶隊）。",
    threeGoodTip: "以理服人化解對立，善用四給茶禮團結好人陣營。"
  },
  villager: {
    icon: "",
    iconKey: "villager",
    themeClass: "role-theme-villager",
    shortRole: "好人陣營・三好偵探",
    cardOneLiner: "憑聽覺與邏輯識破謊言的三好偵探",
    cardNight: "夜間靜息，天亮細聽全場發言",
    cardDay: "標記可信好人與破綻，壓縮狼坑",
    cardVote: "攜手好人公投請離全部酸民狼",
    winCond: "盤清好人坑，公投請離全部酸民狼",
    nightAction: "夜間休養，天亮後比對微表情、發言與票型。",
    dayAction: "自由標記好人坑壓縮狼方空間，善用觀微、奉茶與四給定節奏。",
    threeGoodTip: "存好心找證、說好話化怨、做好事奉茶，解鎖 +1 善意票。"
  },
  wolf: {
    icon: "",
    iconKey: "wolf",
    themeClass: "role-theme-wolf",
    shortRole: "酸民狼陣營・暗中佈局",
    cardOneLiner: "夜襲請離好人、白天偽裝帶風向",
    cardNight: "避開同伴，鎖定 1 位好人散播迷霧",
    cardDay: "偽裝理性好人轉移焦點，掩護狼隊",
    cardVote: "配合同伴歸票，達屠邊即獲勝",
    winCond: "讓所有神職或所有書院生離席（屠邊制）",
    nightAction: "鎖定 1 位好人夜襲，並於屏風指派同伴悍跳或倒鉤。",
    dayAction: "用「狼人佈局板」甩鍋拉票，以獵神筆記鎖定真神職。",
    threeGoodTip: "語氣溫和並適時出四給牌，可點亮偽裝光環降低懷疑。"
  },
  wolf_king: {
    icon: "",
    iconKey: "crown",
    themeClass: "role-theme-wolf_king",
    shortRole: "進階酸民狼・臨離反撲",
    cardOneLiner: "白天遭公投離席時反撲帶走 1 人",
    cardNight: "與同伴夜襲，暗記疑似神職席次",
    cardDay: "大膽帶節奏吸火力，掩護同伴",
    cardVote: "遭公投請離時立刻反撲帶走真神職",
    winCond: "精準獵神屠邊，關鍵時公投反撲帶走神職",
    nightAction: "與同伴選刀並配戰術，靠獵神筆記鎖定真神職。",
    dayAction: "大膽悍跳或抗推；白天遭公投請離（非清心茶）即反撲帶人且無遺言。",
    threeGoodTip: "先以平穩說詞建立信任，出局前再精準帶走核心神職。"
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
    "2. 警徽流與絕不驗對跳：已有人對跳觀察員時，對方在你眼中已是定狼，切勿浪費夜查再去驗他；務必改報『先驗中立疑點 A、再驗 B』的清晰警徽流並盤算剩餘狼坑數。",
    "3. 絕不偷看他人底牌：除自己親自查驗過的對象外，其他人皆須靠當日所有發言與票型綜合判斷。"
  ].join("\n"),
  witch: [
    "1. 低調護場與防自刀騙藥：首夜視局勢評估是否保留暖心回甘茶，第 1 天先低調聽發言，避免過早暴露身分而在夜間遭酸民狼鎖定。",
    "2. 關鍵現身與清心茶反制：一旦有人敢冒充奉茶師、或你的銀水好夥伴遭冤枉集火時，果斷亮牌自證並以清心醒神茶精準請離偽裝者。",
    "3. 綜合聽感：仔細比對雙觀察員世界線與前面所有人的言票矛盾，不盲信單一跳牌的人。"
  ].join("\n"),
  hunter: [
    "1. 穩健威懾：平時低調分析全場發言；若自己被推上投票台或身分被冒充，再亮明直心糾察長身分穩住局勢、壓槍不盲射。",
    "2. 獨立判斷：綜合比對雙觀察員盤坑、夜刀線索與言票矛盾，離席發動正氣共鳴時務必鎖定最大邏輯破綻或冒牌對跳位。"
  ].join("\n"),
  guard: [
    "1. 低調守核與首夜避撞盾：守衛不輕易亮牌！首夜高階局可評估空守防與奉茶師『同守同救破盾』；第 2 夜起優先交錯守護真觀察員、已亮牌單一奉茶師或可信警長，不可連守同一人。",
    "2. 對齊自證：危急時或出現平安夜關鍵轉折再公開守護路線替好人排除雙狼可能。"
  ].join("\n"),
  villager: [
    "1. 盤雙邊世界線與認夜刀遺產：不要別人一跳觀察員就無條件全信；若昨日亮牌觀察員昨夜被刀出局，應高度檢視存活的那位對跳者；並用排除法數清剩餘狼坑數。",
    "2. 抓言票背離與保護鐵神：對比『誰說保誰卻反手砸票』，同時切勿誤投場上唯一的奉茶師、守衛、糾察長或已觸發豁免盾的長老。",
    "3. 追蹤三好態度：留意誰語氣急躁貼標籤或跟可疑者互相護航，理性集中歸票。"
  ].join("\n"),
  elder: [
    "1. 豁免扛壓：你首次被白天公投誤投時會觸發清心長老豁免盾免於離席（之後失去投票權，但保留發言權）。",
    "2. 穩健帶隊：平時以理性態度替真神職扛火並多保可信好人坑；若遭誤推或已觸發護盾，果斷亮牌自證清白並引導好人集中歸票。"
  ].join("\n"),
  wolf_fake_seer: [
    "1. 悍跳抉擇（假查殺 vs 搶發金水）：可依場況選擇強壓對跳觀察員，或在首日尚未對跳時機靈改發好人『金水』拉攏選票與站邊，切忌發無破綻鐵神查殺直接撞牆。",
    "2. 逼真警徽流：具體留出『今晚先驗某中立位、再驗某位』建立視野可信度，同時絕不暴露或無故攻擊你的同伴。",
    "3. 帶動節奏：語氣自信且善於拆解對自己有利的假世界線，順推場上最高熱度好人抗推位。"
  ].join("\n"),
  wolf_stealth: [
    "1. 深水偽裝與順推抗推位：裝作理性熱心的書院生，優先順著場上已經起火的好人抗推位合理補刀推進，絕不與同伴無端硬打暴露關係。",
    "2. 聲援與必要切割：當同伴悍跳觀察員時替其合理背書；若同伴已被全場坐實出局在即，高階局可適度拉開距離保金身、留到末局搶控票。",
    "3. 微妙破綻：在看似客氣的推理中偶爾夾帶一點催票或挑撥語氣，保留三好感化空間。"
  ].join("\n"),
  wolf_king: [
    "1. 獵神威懾：你白天被公投離席（非清心茶）時可發動「最後帶風向」拉走 1 人，因此白天可大膽帶節奏替同伴吸火力。",
    "2. 精準鎖神與低熱好人：優先壓迫場上已知的明心觀察員、滴水奉茶師、護心守衛或高公信力警長，切勿懷疑狼同伴。"
  ].join("\n")
};

const AI_PERSONAS = [
  { id: "xiaocheng", name: "小澄", gender: "male",   trait: "條理時間線與票型派",   deductionStyle: "skeptical", avatarColor: "#38bdf8", register: "data" },
  { id: "nuannuan",  name: "暖暖", gender: "female", trait: "溫和護航反擊派",       deductionStyle: "gullible",  avatarColor: "#fbbf24", register: "warm" },
  { id: "asong",     name: "阿松", gender: "male",   trait: "穩健算輪次帶風向派",   deductionStyle: "skeptical", avatarColor: "#34d399", register: "mountain" },
  { id: "xinger",    name: "星兒", gender: "female", trait: "反骨質疑跟風試水派",   deductionStyle: "gullible",  avatarColor: "#a78bfa", register: "astro" },
  { id: "xiaoyun",   name: "小雲", gender: "female", trait: "冷靜複盤抓矛盾派",     deductionStyle: "skeptical", avatarColor: "#fb7185", register: "press" },
  { id: "azhu",      name: "阿竹", gender: "male",   trait: "從容留白抓潛伏派",     deductionStyle: "balanced",  avatarColor: "#2dd4bf", register: "poetic" },
  { id: "chenchen",  name: "晨晨", gender: "male",   trait: "犀利逼表態衝鋒派",     deductionStyle: "balanced",  avatarColor: "#f97316", register: "sport" },
  { id: "mobai",     name: "墨白", gender: "male",   trait: "書法社社長",           deductionStyle: "skeptical", avatarColor: "#6366f1", register: "classical" },
  { id: "qinglan",   name: "晴嵐", gender: "female", trait: "溫和護航有底線派",     deductionStyle: "balanced",  avatarColor: "#ec4899", register: "guzheng" },
  { id: "alang",     name: "阿朗", gender: "male",   trait: "直球帶隊正面拆視角派", deductionStyle: "skeptical", avatarColor: "#eab308", register: "debate" },
  { id: "youzi",     name: "柚子", gender: "female", aliases: ["小柚"], trait: "直覺抓態度轉彎派", deductionStyle: "gullible", avatarColor: "#84cc16", register: "pastry" }
];

function getSeatGender(seatOrName) {
  if (!seatOrName) return "neutral";
  if (typeof seatOrName === "object") {
    if (seatOrName.isHuman || seatOrName.isPlayer) return "neutral";
    if (seatOrName.gender === "female" || seatOrName.gender === "male" || seatOrName.gender === "neutral") {
      return seatOrName.gender;
    }
    seatOrName = seatOrName.name || "";
  }
  const key = String(seatOrName || "").trim();
  if (!key || key === "你" || key === "玩家") return "neutral";
  if (key === "小柚") return "female";
  for (let i = 0; i < AI_PERSONAS.length; i++) {
    const p = AI_PERSONAS[i];
    if (p.name === key || (Array.isArray(p.aliases) && p.aliases.indexOf(key) !== -1)) {
      return p.gender || "neutral";
    }
  }
  return "neutral";
}

function getSeatHonorific(targetSeat) {
  if (!targetSeat) return "";
  if (typeof targetSeat === "object" && (targetSeat.isHuman || targetSeat.isPlayer)) return "";
  const g = getSeatGender(targetSeat);
  if (g === "female") return "學姐";
  if (g === "male") return "學長";
  return "";
}

const PERSONA_FLAVORS = {
  "小澄": {
    bio: "條理時間線派（說話短促精準：只認發言先後時間線、警下票型流向與利益關係，不吃溫情牌）",
    openFirst: [
      "欸我第一個講喔，現在桌上還沒什麼線索可以對啦。我先報個好人身分，後面大家講具體一點比較好盤，換 {next} 講囉。",
      "第一個開麥其實沒什麼東西好盤耶，我先站好人這邊聽完這輪，看等等誰講話前後兜不攏，交給 {next}。",
      "好，輪到我起頭吼…目前還沒前情就不亂點人了，我是清白好人，那換 {next} 接著聊吧。"
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
      "第一個講真的沒什麼線索啦，不過老實說吼，坐在後面的 {t} 聽完大家講話最好編故事了，等一下輪到 {t} 我會特別仔細聽。",
      "現在資訊太少還不好說，但通常排後面的像 {t} 最容易看風向講話，待會聽聽看 {t} 怎麼說囉。",
      "我先留個觀察點喔，現在還沒人表態，不過我待會想特別聽 {t} 的說法，看他會不會順著風向偷帶節奏。"
    ],
    wolfSpoken: [
      "欸等一下，我剛把話順了一遍，{t} 前後講的根本兜不起來吧？聽起來超像硬湊理由在帶風向耶，我這輪先把票投給 {t} 喔。",
      "老實講吼，剛剛聽完 {t} 那段我覺得超怪的，自己講話前後矛盾還急著催票，這很像酸民狼在攪局啊，這輪我投 {t}。",
      "不是啊，{t} 剛剛也沒講出什麼實際理由就急著貼標籤，照刪去法看他嫌疑最大吧，這輪先出 {t}。"
    ],
    wolfWait: [
      "前面幾位聽下來都還算合理啦，現在比較難抓的反而是後面的 {t}，聽完大家才講最容易混水摸魚，待會仔細聽 {t} 怎麼說。",
      "前段我聽著沒什麼大問題，接下來重點聽還沒開口的 {t} 吧，看他講不講得出自己的看法。",
      "目前前面幾位還滿順的，我先把問號留在還沒發言的 {t} 身上，等聽完他怎麼盤再決定。"
    ],
    goodSus: [
      "欸我剛把前面幾位的時間點對了一下，{t} 講的話破綻真的有點大耶，而且口氣超急著帶節奏。我們好好講道理，但我這票會先投 {t}。",
      "說真的，聽下來覺得 {t} 一直在製造緊張感，可是又講不出什麼實際線索，用刪去法看我這輪先投 {t} 喔。",
      "對照一下剛剛大家的態度，我覺得 {t} 前後漏洞最多、講話也有點衝，這輪我建議先請 {t} 去旁邊冷靜一下。"
    ],
    goodAlly: [
      "剛剛聽下來我覺得 {t} 講話前後滿一致的，也沒有亂帶情緒，感覺是好人啦，我先把 {t} 放好人坑。{tail}",
      "我有對了一下細節，{t} 講得滿有條理又不急躁，目前我覺得 {t} 偏像好夥伴喔。{tail}",
      "老實說 {t} 剛剛那段滿誠懇的，理由也都說得通，這輪我先保一次 {t}。{tail}"
    ],
    lastGood: "「好喔好喔，清白好人就這樣被你們投離席了！我先在場邊看你們明天怎麼複盤，記得回頭查剛才帶頭投我最用力那位。」",
    lastWolf: "「算你們這桌時間線對得夠死，我沒法硬凹了！先退場看戲，後面剩餘坑位可沒那麼好找。」"
  },
  "暖暖": {
    bio: "溫和護航反擊派（台灣女大生日常聊天語氣：不輕易跟風踩緊張好人，遇到惡意抗推明確反擊，常說『大家先別急嘛』『老實說這點不太對』）",
    openFirst: [
      "嗨大家好～輪到暖暖第一個講耶，好緊張喔。我先幫大家倒杯熱茶放輕鬆啦，我是好人喔，今天我們好好聊天別吵架，換 {next} 講囉！",
      "茶剛泡好大家慢慢聽喔～第一個講話真的沒什麼頭緒耶，我先乖乖報個好人身分，等一下仔細聽 {next} 怎麼說。",
      "咦居然是我開局呀…現在桌上還安安靜靜的看不出線索，希望大家今天心平氣和一起找狼，那我先交給 {next} 囉～"
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
      "第一個講話真的什麼都還不知道耶…不過老實說，我剛剛看坐在後面的 {t} 好像特別淡定，待會輪到 {t} 大家記得仔細聽聽看喔～",
      "開局好難猜喔，我先幫大家添口茶～不過排後面的 {t} 聽完大家才講話最容易順著演了，等一下要多留意 {t} 喔。",
      "哈囉我先起個頭啦，雖然還沒線索，但總覺得後排的 {t} 特別安靜，待會換他講的時候大家多聽幾句細節喔。"
    ],
    wolfSpoken: [
      "哎呀我平常最不好意思懷疑人了…可是老實說，剛剛聽 {t} 講完心裡有點毛毛的耶，總覺得他在偷偷帶風向推別人…這輪我們先請 {t} 去旁邊喝茶冷靜好不好？",
      "怎麼辦…剛剛聽完 {t} 那段話覺得哪裡怪怪的，表面客客氣氣可是好像一直在挑撥大家耶，我想了想這輪還是先投 {t} 好了。",
      "我也很希望是我想太多啦，但 {t} 剛剛那樣急著找人背鍋真的有點刻意耶…為了保護好人，這輪我只好先投 {t} 囉。"
    ],
    wolfWait: [
      "前面幾位聽起來都滿真誠的呀，我反而有點擔心後面還沒開口的 {t} 耶，聽完全場才講話最容易順著演了，待會大家仔細聽 {t} 喔～",
      "前面大家講話都溫溫和和的很自然，倒是還沒說話的 {t} 讓我有點在意，等一下聽聽看 {t} 夠不夠誠懇囉。",
      "目前前面聽不太出壞人耶～不過後面的 {t} 有收尾優勢，大家等等注意看他會不會順風推人喔～"
    ],
    goodSus: [
      "欸大家先喝口茶別動氣嘛…可是老實說，剛剛 {t} 那個口氣真的有點刺刺的，一直想挑撥大家吵架耶，這輪我們溫和一點先投 {t} 請他冷靜好不好？",
      "暖暖平常很少懷疑人的，但剛剛聽 {t} 一直扣別人帽子又沒講什麼道理，聽了真的不太放心，這輪我只好先投 {t} 囉。",
      "我們好好講話不要被帶節奏喔～我覺得 {t} 剛剛一直急著催票製造緊張最可疑了，這輪我會投 {t}。"
    ],
    goodAlly: [
      "剛剛聽 {t} 講話覺得很舒服耶，很替大家著想又不會亂兇人，暖暖先相信 {t} 是好夥伴喔！{tail}",
      "我聽得出來 {t} 剛剛講得很真心，一點挑撥的味道都沒有，我今天一定站在 {t} 這邊！{tail}",
      "聽完 {t} 慢慢幫大家理線索覺得好安心喔，語氣又溫和，暖暖這輪先保 {t}！{tail}"
    ],
    lastGood: "「嗚…暖暖平常泡茶這麼體貼，你們還是狠心把好人送出場了啦！我先去旁邊喝花茶，明天大家發現真相記得跟我道歉喔…」",
    lastWolf: "「哎呀暖暖都裝得這麼溫柔了還是被抓包喔…好啦大家眼睛太利了，我乖乖去場邊看戲，祝你們後面撐住囉～」"
  },
  "阿松": {
    bio: "穩健算輪次派（台灣接地氣直覺口吻：自然鬆弛、緊盯容錯輪次與票型流向，常說『老松講句實在話吼』『別急啦』『算一下輪次』）",
    openFirst: [
      "嘿，頭一個換老松開麥啦！今天山城天氣這麼舒服，大家別一上來就火氣大吼。我先講明我是老實好人，後面大家有話直說就好，換 {next} 啦。",
      "哈哈，剛爬完山精神正好第一個講！現在桌上還沒半點風聲啦，老松先站好人這邊聽一輪，後面各位直接講重點就好。",
      "首發輪到老松喔，別緊張啦～爬山最忌還沒看清路就亂衝，我先報個清白好人，換 {next} 接棒講兩句。"
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
      "咳，第一個講話真的沒風向可聽啦，不過老松看人很準吼，排後面的 {t} 最愛等大家講完才撿現成的話講，等一下大家盯緊 {t} 聽聽看。",
      "頭位沒前面的人好對照，但走夜路最怕後面有人搞小動作，後排那個 {t} 聽完全場才講話，待會可得好好聽他怎麼表態。",
      "老松先講兩句啦，現在誰都還沒露底，我就先記著後面的 {t}，越晚講越容易順風演戲，等下看他表現囉。"
    ],
    wolfSpoken: [
      "欸老松講句實在話吼，剛剛聽 {t} 講半天都在繞圈子，一點實在的理由都沒有還一直偷推人，聽起來超心虛啊！這票老松直接投 {t} 啦。",
      "不是我愛唸啦，剛剛 {t} 那幾句話彎彎繞繞又愛暗中抹黑別人，老松聽太多次這種套路了，八成是狼，這輪先投 {t}！",
      "老實講，剛剛 {t} 真是越描越黑耶，重點不敢回只會放煙霧彈帶節奏，咱們別繞遠路，這輪先出 {t} 啦。"
    ],
    wolfWait: [
      "前面這幾位聽起來都還算實在啦，老松倒想先點一下後面的 {t}，越後面講話越容易看風向演戲，待會輪到 {t} 可別想隨便混過去喔。",
      "前段大家講得四平八穩的，關鍵要盯還沒開口的 {t} 啦，看準風向再順水推舟最危險了，等等留意 {t}。",
      "目前前面沒看到什麼大問題，老松等著聽 {t} 待會怎麼收尾，後置位要是不敢亮態度那就很可疑囉。"
    ],
    goodSus: [
      "欸老松講句公道話，剛剛 {t} 講話一直帶刺、硬要煽動大家互咬，這完全不像好人在找線索嘛！我們和氣歸和氣，但這輪老松鐵定投 {t}。",
      "大家眼睛放亮一點喔，剛剛 {t} 那股急著催票、挑撥離間的口氣最像酸民狼了！別上他的當，這輪我堅持投 {t}！",
      "聽了一圈就屬 {t} 講話最虛，沒半點根據只靠情緒壓人，照老松的經驗這位置超危險，這輪先請 {t} 出去吹吹風冷靜啦。"
    ],
    goodAlly: [
      "剛剛聽 {t} 講得穩穩當當、不急不徐又有道理，聽起來就是靠得住的好夥伴啦，老松這輪先挺 {t}！{tail}",
      "不錯喔，{t} 這番話夠坦白也有根據，老松看人很準的，{t} 偏像好人我先站他這邊！{tail}",
      "難得聽到像 {t} 這樣實話實說、不講酸話的隊友，這輪老松先保 {t} 啦！{tail}"
    ],
    lastGood: "「哈哈居然真把老松投下山啦！我堂堂好人去旁邊喝茶看風景沒關係，你們明天發現剛才帶頭衝我票的是狼，可別在山上喊冤啊！」",
    lastWolf: "「哎呀薑還是你們辣啦，老松這趟走夜路踩滑被抓包了，服氣服氣，先去旁邊泡壺好茶看你們後面怎麼收尾囉！」"
  },
  "星兒": {
    bio: "觀星社直覺系少女（台灣女大生自然靈動口語：直覺敏銳、反應真實，常說『欸等一下啦』『我剛聽完起雞皮疙瘩耶』『直覺超怪的』）",
    openFirst: [
      "欸居然是我第一個講話喔！剛開始還沒有人發言真的超難猜啦，我先說我是好人喔，今天大家好好聊別吵架，快換 {next} 講看看！",
      "哇第一棒交給我耶…現在桌上什麼線索都還沒有，反正星兒是清白好夥伴啦，我先專心聽 {next} 待會怎麼說。",
      "嗨大家～第一個開麥真的沒東西盤耶，我先乖乖報好人身分，等一下誰講話心虛我直覺很準喔，換 {next} 接棒！"
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
      "雖然我第一個講還沒聽到大家說話啦，可是不知道為什麼，我剛看後面的 {t} 就覺得直覺怪怪的耶，後置位最容易順風演戲了，待會大家盯緊 {t} 聽喔。",
      "第一個開麥好難猜喔…但我第六感一直覺得坐在後排的 {t} 很有戲耶，等一下輪到他講話大家注意聽他會不會心虛！",
      "現在還沒人表態啦，不過我直覺一直叫我留心後面的 {t}，如果他待會講話太滑溜跟著別人走就超可疑喔。"
    ],
    wolfSpoken: [
      "蛤？等一下啦，剛剛 {t} 講那什麼啊？一直在轉移話題耶，我剛聽完真的起雞皮疙瘩了，直覺他超像酸民狼的，這輪我先投 {t} 喔！",
      "欸你們剛剛聽 {t} 講話不覺得哪裡怪怪的嗎？講話飄來飄去又一直想帶風向推別人，我覺得嫌疑超大耶，這輪我投 {t}！",
      "老實說剛聽完 {t} 那段我心裡直接亮紅燈耶，完全沒講出實在理由卻急著亂點人，這輪我的票一定投給 {t}。"
    ],
    wolfWait: [
      "前面大家講完感覺都滿自然的耶，可是我現在直覺突然有點在意後面的 {t}，聽完大家才講最容易編故事了，待會大家仔細聽 {t} 怎麼說喔。",
      "前排聽起來都滿像好人的說～我反而比較好奇還沒開口的 {t}，看他等一下會不會趁機偷帶風向找人背鍋！",
      "前面我聽著沒什麼問題啦，先把觀察重點放在還沒講話的 {t} 身上，等等仔細聽他的語氣囉。"
    ],
    goodSus: [
      "欸等一下啦…你們有聽出來嗎？剛剛 {t} 講話超衝、一直在故意挑撥大家互吵耶！我聽完真的起雞皮疙瘩，這種節奏超像酸民狼，這輪我先投 {t} 喔。",
      "老實說 {t} 剛剛那個口氣真的太急著扣帽子了吧，一點都不像在找線索啊，我直覺他問題最大，這輪投 {t}！",
      "我第六感很少錯喔，剛剛就屬 {t} 講不出道理還一直想帶偏大家，這輪決定先把票給 {t} 請他冷靜一下。"
    ],
    goodAlly: [
      "哇剛剛聽 {t} 講話覺得超順超真誠的，完全沒有亂扣別人帽子，我直覺認證 {t} 是好夥伴喔！{tail}",
      "我很喜歡剛剛 {t} 講話的感覺耶，有道理又溫和，這輪我先相信 {t} 是好人！{tail}",
      "剛剛 {t} 幫大家理線索超清楚的，聽起來就很正派啊，這輪我保 {t}！{tail}"
    ],
    lastGood: "「蛤？！竟然把無辜星兒投下桌了啦！剛剛帶頭推我的人裡一定藏著酸民狼，我就在旁邊捧臉等你們明天翻車喊後悔喔！」",
    lastWolf: "「哎呀被你們抓到剛才在心虛了喔…好吧星兒認輸先去旁邊看星星，不過這局後面還有大反轉等著你們啦！」"
  },
  "小雲": {
    bio: "冷靜複盤派（台灣知性女大生自然口語：邊聽邊對照雙邊視角差、抓偷換概念，常說『慢著』『我剛記了一下』『這前後對不起來』）",
    openFirst: [
      "好，輪到我第一個講喔。現在前面還沒人發言沒辦法對細節，我先報清白好人身分，等一下大家講話記得把理由講清楚別模糊帶過喔，換 {next}。",
      "第一個開麥很單純啦，我是好人，筆記本已經攤開準備好了，待會每個人講的時間點跟立場我都會記下來對照，交給 {next}。",
      "我先起個頭喔，目前還沒有資訊可以核對，我站好人這邊慢慢聽，等一下誰講話前後矛盾我就直接點出來囉。"
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
      "第一個講雖然還沒東西可以對照啦，不過照經驗吼，排在後面的 {t} 最有空間聽完大家風向再改口，待會他一講話我就會仔細對細節喔。",
      "開局資訊還是空白的，我先記下後排的 {t} 重點觀察——越晚講話越容易順著大家的話藏自己立場，等一下多聽幾句。",
      "我先開個頭啦，排在後段的 {t} 最容易看懂風向再跟著補刀，待會輪到 {t} 大家記得仔細聽他的理由。"
    ],
    wolfSpoken: [
      "欸慢著，我剛邊聽邊記了一下喔，{t} 前面講的跟後面講的明顯對不起來啊，還一直想把焦點帶去別人身上，這輪我先鎖定投 {t}。",
      "等一下，你們剛沒發現 {t} 講話一直在繞圈子嗎？問重點都不正面回卻急著推別人，根本經不起細問啊，這輪我明確投 {t}。",
      "我剛在筆記上記了一筆很大的矛盾喔，{t} 理由前後跳來跳去又不講根據，很明顯在混水摸魚，這輪先請 {t} 離席吧。"
    ],
    wolfWait: [
      "前面幾位講的我剛都記下來了，目前聽著還算順；接下來重點看還沒發言的 {t} 囉，看他會不會趁收尾偷帶風向。",
      "前段大家態度都滿清楚的，現在最需要留心的是還沒開口的 {t}，越後面講越要看他敢不敢給明確立場。",
      "前面整理得還滿乾淨的，待會仔細聽還沒說話的 {t} 吧，希望別只是重複別人的結論混過去。"
    ],
    goodSus: [
      "欸我把剛剛記的筆記對了一遍，{t} 不但沒講出實在證據，還一直用很衝的口氣帶假風向，這超像酸民狼的操作啊！大家理性歸票，這輪先出 {t}。",
      "老實說核對下來，{t} 剛剛講的話漏洞最多又急著催大家投票，完全不像在找真相，建議這輪集中投 {t}。",
      "聽完一圈下來，{t} 挑撥情緒的部分比實際推理多太多了，很明顯想打亂好人節奏，我這票先給 {t}。"
    ],
    goodAlly: [
      "我剛對了一下筆記，{t} 前後時間點講得很穩、態度也客觀不亂貼標籤，我先把 {t} 記在好人這邊。{tail}",
      "細聽 {t} 剛剛理的脈絡完全說得通，沒有那種硬帶風向的感覺，這輪我先認 {t} 是好夥伴。{tail}",
      "在細節跟邏輯上目前都挑不出 {t} 什麼毛病，講得滿實在的，這輪先挺 {t}！{tail}"
    ],
    lastGood: "「欸這根本本日最大烏龍吧！我是清白好人耶，剛才推我的名字我都寫進筆記本了，我坐旁邊等你們明天怎麼翻案！」",
    lastWolf: "「算你們抓到前後時間差，這桌耳朵太尖真不好混！我認輸先去旁邊整理筆記，不過好戲才正要上場喔！」"
  },
  "阿竹": {
    bio: "冷眼留白抓潛伏派（溫和書卷氣：自然現代白話帶從容感，專盯低調跟風座位，偶爾點綴『聽其言觀其行』『清者自清』）",
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
    lastGood: "「哈哈，清者自清！這杯冤枉茶我笑納啦，我先退席慢品凍頂，各位明天回頭看看誰在背後推波助瀾，包準精彩。」",
    lastWolf: "「看來這壺茶沒能瞞過大家慧眼，阿竹甘拜下風先退席賞竹去啦，只是後面這幾沖茶味可還濃著呢！」"
  },
  "晨晨": {
    bio: "山城球社陽光隊長（台灣運動系男大生自然口語：爽朗直率、講義氣，常說『欸兄弟們』『不是啊』『講話乾脆一點』『這輪直接投』）",
    openFirst: [
      "欸第一個換我講喔！剛開始還沒什麼線索啦，我先直接講我是好人，大家今天講話乾脆一點別躲躲藏藏的，換 {next} 接著講吧！",
      "哈囉首棒交給我啦，剛打完球腦袋還滿清醒的，現在沒前情我就先站好人這邊聽一輪，看 {next} 怎麼開局囉。",
      "第一個開麥沒東西盤啦，我先幫好人把態度亮出來，等一下誰講話心虛閃躲我們再來抓，交給 {next}！"
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
      "雖然我第一個講還沒線索啦，不過老實說，排在後面的 {t} 聽完大家才講話最容易偷看風向了，待會輪到 {t} 大家記得盯緊一點喔。",
      "開局先講個直覺吼，每次坐後排的像 {t} 最容易順著別人的話演好人，等一下大家注意聽 {t} 怎麼表態！",
      "第一個講沒辦法點誰啦，但後面那位 {t} 待會要是不敢講清楚立場、只想跟著混過去就很有問題喔。"
    ],
    wolfSpoken: [
      "欸不是啊兄弟們，剛剛 {t} 那段破綻也太大了吧？講話心虛又一直在亂點火，這不直接投出去說不過去吧，我這票先投 {t} 喔！",
      "喂等一下，{t} 剛剛在講什麼啊？前後邏輯漏成那樣還想帶散好人節奏，聽起來超像酸民狼的，這輪我全力出 {t}！",
      "老實講剛剛聽完 {t} 我真的忍不了耶，沒半點根據卻一直偷帶風向，這種打法太像狼了，我先把票給 {t}。"
    ],
    wolfWait: [
      "前面幾位聽起來都滿乾脆實在的，現在重點要看還沒開口的 {t} 囉，越晚講話越容易混水摸魚，待會仔細聽 {t}。",
      "前面大家節奏都滿正常的，接下來就看坐後面的 {t} 敢不敢正面亮態度了，別讓狼順風躲過去喔！",
      "前段沒聽出什麼大毛病，好人別鬆懈，等一下後面 {t} 一開口我們馬上聽他的理由夠不夠硬。"
    ],
    goodSus: [
      "欸各位好人醒醒喔！剛剛 {t} 講話酸溜溜一直在破壞我們團結，破綻全露出來了啦！別被他帶偏，這輪大家把票集中投給 {t}。",
      "太不對勁了吧，{t} 剛剛火氣那麼大卻拿不出半點線索，擺明想讓好人自己吵起來啊！這波我站出來先投 {t}！",
      "大家別退縮喔，聽下來就屬 {t} 最像躲在後面放冷箭的酸民狼，我們講道理但這票一定要投 {t}。"
    ],
    goodAlly: [
      "讚喔！剛剛 {t} 講得超坦白又有道理，聽起來就是自己人啦，這輪我先力挺 {t}！{tail}",
      "這才像好夥伴嘛，聽完 {t} 乾脆俐落的整理，這波我直接站 {t} 這邊！{tail}",
      "感覺超對的，{t} 講話直來直往不講酸話，今天我挺 {t} 到底！{tail}"
    ],
    lastGood: "「欸不是吧，怎麼把我這個好人主力投下場啦？！我先拿毛巾去場邊喘口氣，下輪不抓出帶風向的狼我真的會念一整晚喔！」",
    lastWolf: "「哈哈這局防守太硬，假動作直接被看穿了！我爽快認輸先去旁邊喝水，但勝負還沒定，你們可得繃緊神經囉！」"
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
    lastGood: "「好一場精彩誤判，竟請離了清白好人。我先退席沏壺清茶，明日靜待各位回看票型、恍然大悟。」",
    lastWolf: "「各位確是明察秋毫，這一手佈局終究沒能瞞天過海。墨白甘拜下風先退席品茶，不過這局精彩處才正要展開呢。」"
  },
  "晴嵐": {
    bio: "溫和護航有底線派（溫雅聽音派：自然現代白話，不隨便踩首日緊張好人，遇惡意帶風向會明確反擊，常說『弦外之音』『清濁分明』）",
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
    lastGood: "「哎呀曲子才彈到一半就被大家誤投出場了呢…晴嵐真是清白好人，先去場邊端茶等各位聽出弦外之音喔。」",
    lastWolf: "「哎呀這根走音的弦終究被大家的金耳朵聽出來了呢，晴嵐佩服，先退席調琴看戲去囉。」"
  },
  "阿朗": {
    bio: "辯論社犀利主辯（台灣辯論社男大生真實口語：反問犀利但不像唸稿，常講『欸等一下』『這證據在哪』『你這邏輯說不通啊』『先照證據投』）",
    openFirst: [
      "欸第一個輪到我喔，現在桌上還沒半點證據可以盤啦。我先亮明我是清白好人，後面大家講話記得拿出實際證據別打太極喔，換 {next} 申論。",
      "首發最單純啦，我站好人這邊，等一下大家把立論跟理由講清楚，我們再來交叉比對誰有漏洞，請 {next} 開始吧。",
      "我先開個頭吼，有證據講證據、別靠感覺亂扣帽子，目前還沒前情，接下來看 {next} 怎麼說囉。"
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
      "第一個講雖然還沒人發言可以質詢啦，不過排後面的 {t} 聽完全場才講話，最容易順著風向偷換概念，待會大家盯緊 {t} 聽喔。",
      "開局還沒證據可對，但我先記下後排的 {t}，越晚講話越要看他拿不拿得出獨立證據，待會仔細聽。",
      "我先定個標準吼，前面還沒破綻，後面壓陣的 {t} 待會要是不敢明確表態就經不起追問囉。"
    ],
    wolfSpoken: [
      "欸等一下，請問 {t} 你剛剛那套說法證據在哪啊？前後邏輯根本接不上還急著帶風向，這完全站不住腳吧，這輪我先投 {t}。",
      "不是啊，直接點破剛剛最大的漏洞喔，{t} 立場搖來搖去卻急著扣人帽子，這太像酸民狼的話術了，這輪我推 {t}。",
      "把剛剛的話攤開來質詢一下，{t} 重點問題全閃掉只會催大家投票，嫌疑真的太大了，這票我鎖定 {t}。"
    ],
    wolfWait: [
      "前面幾位講的立論還算完整啦，真正要質詢的是還沒開口的 {t}，待會聽他講不講得出實在證據，還是只會跟著附和。",
      "前段聽下來都還站得住腳，接下來全場看後面的 {t} 交不交得出合理的說法囉。",
      "前排夥伴基本沒什麼大漏洞，最大變數在還沒申論的 {t} 身上，等等聽他怎麼講。"
    ],
    goodSus: [
      "欸我提出異議喔，把前面大家的說法攤開比對，{t} 既拿不出實際證據又一直在偷換概念挑撥對立，這輪我建議直接投 {t}。",
      "老實說交叉比對下來，{t} 剛剛破綻最多而且答非所問，很明顯在轉移焦點，這輪大家集中把票壓給 {t} 吧。",
      "大家別被話術繞暈喔，剛剛 {t} 完全不敢正面回問題只靠情緒反咬，這種打法最危險了，這輪我投 {t}。"
    ],
    goodAlly: [
      "剛剛 {t} 那段講得很有證據跟條理耶，完全經得起追問，這輪我先挺 {t} 放好人坑。{tail}",
      "不錯喔，{t} 剛剛切中重點又沒亂扣帽子，這才是真好人的視角，我先認下 {t}！{tail}",
      "聽完 {t} 的立論覺得線條很清楚、沒有閃躲，這輪我先保 {t} 是好夥伴。{tail}"
    ],
    lastGood: "「這絕對是本季最大誤判！我清白好人保留抗議權，先坐場邊等你們明天拆穿剛才閃避我質詢的狼！」",
    lastWolf: "「漂亮漂亮，這局你們的證據鏈鎖得太死，連我都沒辦法狡辯！我大方認輸先退席，但這場比賽可還沒結束喔！」"
  },
  "柚子": {
    bio: "直覺抓態度派（台灣女大生輕快直接口語：擅長抓別人發言前後態度不一致、心虛閃躲或突然縮回去的破綻，絕不拐彎抹角）",
    openFirst: [
      "嗨大家，輪到柚子第一個講話囉！目前場上都還沒人發言，我先報清白好人身分，等聽完後面幾位態度再看怎麼投，換 {next} 講。",
      "第一個開口真的沒什麼線索好猜啦，柚子先站好人這邊聽一輪，看誰講話態度閃閃躲躲，換 {next} 接棒。",
      "首發還沒辦法比對前後發言呢，我先明說自己是好夥伴，等等專心聽 {next} 和後面各位怎麼表態。"
    ],
    seerWolf: [
      "欸大家快聽我說！其實柚子是這局的明心觀察員，昨晚我去查了 {t}，確定他就是酸民狼！{ctx}這輪票別散掉，大家集中投 {t}！",
      "我不能再藏牌了，我是明心觀察員！昨晚查過 {t} 確定他就是藏在裡面的酸民狼！{ctx}好夥伴們別猶豫，這輪集中投 {t}！",
      "柚子直接講實話囉，我就是真明心觀察員，昨晚一查 {t} 果然是酸民狼！{ctx}這輪大家一起投 {t} 把狼坑補齊！"
    ],
    seerGood: [
      "跟大家報個好消息喔，柚子其實是明心觀察員，昨晚查了 {t} 是清白好夥伴！請大家別誤傷他，等等聽聽 {next} 怎麼說。",
      "我是真的明心觀察員喔，昨晚先驗了 {t} 確定是清白好人，這席先穩穩保住，下一棒看 {next} 怎麼聊。",
      "直接交驗報個安心位置，我是明心觀察員，昨晚查過 {t} 百分百是好人！接下來換聽 {next} 怎麼盤。"
    ],
    fakeSeer: [
      "等一下喔！大家別被前面騙走了，我柚子才是這局真的明心觀察員！昨晚我查到 {t} 就是酸民狼，這輪快跟我一起投 {t}！",
      "欸不對啦，真正的明心觀察員在我這邊！昨晚親手驗了 {t} 是酸民狼，大家票集中一起投 {t}！",
      "才不是前面講的那樣呢，真正拿到觀察員牌的是柚子！昨晚查出 {t} 是酸民狼，好夥伴們這輪請集中投 {t}。"
    ],
    witchSave: [
      "我舉手補個關鍵資訊喔，柚子其實是滴水奉茶師，前晚看到 {t} 被迷霧鎖定，馬上端暖心回甘茶救回來了，{t} 百分百是好人。",
      "我出來幫 {t} 作證喔，我是滴水奉茶師，暖心回甘茶就是給 {t} 喝的，大家千萬別投錯好人。",
      "這裡有很重要的線索喔，柚子是滴水奉茶師，之前親手救回 {t} 的，他是鐵好人，大家改看其他嫌疑位吧。"
    ],
    wolfFirst: [
      "第一個講真的還沒線索可對…不過排在後面的 {t} 聽完大家講完再接話最容易順風演戲，待會輪到 {t} 大家記得聽仔細一點。",
      "先跟大家講清楚我這邊是好人，現在還沒人發言，我等一下想專心聽後面的 {t} 會不會只跟著順風講。",
      "首發還沒辦法比對態度啦，但通常越晚開口像 {t} 那樣越容易看大家反應改口，待會注意聽 {t} 怎麼說。"
    ],
    wolfSpoken: [
      "等一下喔，剛剛聽 {t} 前面語氣超硬，被問到細節又突然縮回去，前後態度差太多了吧，這輪我先投 {t}。",
      "怎麼感覺 {t} 剛剛越講越心虛啊，問到關鍵點就一直閃躲轉移話題，還想帶大家投別人，這輪我先投 {t}。",
      "剛才 {t} 先是幫腔點人、接著又立刻把話收回來，態度這樣反覆真的很可疑耶，這輪我先投 {t}。"
    ],
    wolfWait: [
      "前面幾位講得都滿坦白的耶！接下來就看還沒發言的 {t} 態度穩不穩，別只想等著最後跟票混過去。",
      "前排聽起來立場都還滿清楚的，那酸民狼說不定就躲在還沒開口的 {t} 那邊，待會仔細聽他怎麼表態。",
      "前面的發言我都聽過了，柚子現在最留意還沒說話的 {t}，看他等一下會不會只是複讀別人的觀點。"
    ],
    goodSus: [
      "等一下喔，聽完這輪我覺得 {t} 前後態度轉太快了吧，剛才講得像有把握、轉頭又不敢擔責任，還想帶節奏，這輪柚子先投 {t}。",
      "老實說我剛聽完覺得 {t} 心虛感太重了，前後理由兜不起來卻一直催票，這輪先請 {t} 離席冷靜比較妥當。",
      "前面幾位講得都比 {t} 坦蕩耶，{t} 一直躲在後面閃避追問又故意帶偏焦點，為了保護好人我這輪先投 {t}。"
    ],
    goodAlly: [
      "剛剛 {t} 講話態度很乾脆耶，立場從頭到尾都沒閃縮，聽起來就是可靠好夥伴，柚子先挺 {t}！{tail}",
      "聽完 {t} 講的話覺得很踏實，沒有故意轉彎閃躲的感覺，我先把 {t} 放好人坑！{tail}",
      "剛剛 {t} 講得很直接又有理，敢正面接大家的追問，柚子這輪先保 {t}！{tail}"
    ],
    lastGood: "「好吧…把我這個清白好人投出去真的太可惜了！快回頭抓剛才帶頭轉風向、推我最用力的那幾個人，裡面一定藏著狼。」",
    lastWolf: "「哎呀態度一縮還是被你們看穿了，大家抓破綻真夠狠的！好啦我認輸離席，後面剩下的隊友可沒這麼好抓喔。」"
  }
};

// Per-persona signature cadence, rebuttal openers, signoffs & silent micro-reactions (attached to PERSONA_FLAVORS)
const PERSONA_VOICE_STYLES = {
  "小澄": {
    lead: ["對了，", "順一下剛剛的節奏，", "講點我剛想到的，", "欸我先順一下前面的時間點喔，", "照剛剛大家講的順序來看吼，", "我直接用刪去法順一遍，"],
    rebutLead: ["欸等一下，這指控前後兜不攏吧，", "不是啊，先把前因後果對清楚再說，"],
    dualLead: ["現在有兩個人跳明心觀察員嘛，我直接拆兩邊對一下狼坑，", "雙觀察員對跳用刪去法看最快，兩邊坑位這樣對，"],
    signoff: ["大概先講到這。", "先聽後面怎麼接。", ""],
    reactGasp: ["這哪裡對得上啊？", "先對一下時間點好嗎"],
    reactVouch: ["嗯，這點跟我想的一樣", "穩，照這條線走"],
    reactNod: ["這段講得滿順的", "有抓到重點喔"],
    reactDoubt: ["前後有點兜不攏耶…", "這句聽起來怪怪的"]
  },
  "暖暖": {
    lead: ["嗯…我想了想，", "趁大家聊完我補一句，", "大家別這樣嘛，我講一句，", "欸大家先喝口熱茶慢慢聊，", "大家別急著動氣嘛，我順一下剛剛聽到的，", "老實說我剛邊喝茶邊聽下來呀，"],
    rebutLead: ["咦…怎麼突然點到暖暖了啦，", "哎呀先別急著把暖暖推進狼坑嘛，"],
    dualLead: ["場上有兩位觀察員撞在一起耶，我們心平氣和把兩邊坑位看清楚，", "大家先別慌，我們慢慢把兩邊觀察員的狼坑攤開來比，"],
    signoff: ["大家和和氣氣投票喔。", "後面幾位也講講看吧。", ""],
    reactGasp: ["咦？怎麼會懷疑我…", "人家真的是好人啦…"],
    reactVouch: ["謝謝你相信暖暖～", "聽了好安心喔！"],
    reactNod: ["講得好溫和真誠喔", "嗯嗯我贊成！"],
    reactDoubt: ["口氣刺刺的有點怕…", "這句聽了心裡毛毛的"]
  },
  "阿松": {
    lead: ["說真的，", "照老松直覺來看，", "話不多說直接看點，", "欸老松講兩句實在話吼，", "聽老松看人的經驗順一遍，", "咱們別繞圈子，從頭順一下剛剛的風向，"],
    rebutLead: ["哈哈別鬧老松了啦，你看錯人了吧，", "喂喂這頂帽子扣太快了吧，"],
    dualLead: ["現在兩個人跳觀察員嘛，老松幫大家把兩條路算清楚，", "雙觀察員擺在檯面上，我們直接看兩邊狼坑合不合理，"],
    signoff: ["老松看法就是這樣。", "大家眼睛放亮一點。", ""],
    reactGasp: ["老兄你看走眼了吧？", "別亂推老實人啊！"],
    reactVouch: ["算你內行！夠義氣！", "正港好隊友啦！"],
    reactNod: ["這話實在中聽喔", "沒錯，就是這道理"],
    reactDoubt: ["講話霧濛濛的有鬼喔…", "老松不吃這套啦"]
  },
  "星兒": {
    lead: ["我說啊，", "我剛閃過一個念頭，", "直覺告訴我一件怪事，", "欸等一下喔，我剛聽下來很有感覺耶，", "老實說我直覺剛剛突然響了一下，", "我先講我剛聽完的第一直覺，"],
    rebutLead: ["蛤？等一下啦怎麼突然點我，", "欸不是吧，怎麼懷疑到星兒頭上啦，"],
    dualLead: ["哇兩個人跳明心觀察員耶，我直接把兩邊狼坑攤開對一下，", "雙觀察員撞牌超刺激的，我們看哪一邊比較自然，"],
    signoff: ["反正我直覺是這樣啦。", "你們後面怎麼看？", ""],
    reactGasp: ["蛤？太冤枉了吧！", "才不是我咧！"],
    reactVouch: ["耶你超懂我的！", "謝謝相信我啦！"],
    reactNod: ["對對對我也這樣想！", "直覺超準贊成！"],
    reactDoubt: ["聽完有點起雞皮疙瘩…", "這語氣怪怪的喔"]
  },
  "小雲": {
    lead: ["記一下，", "對一下筆記，", "剛才那段我記了一筆，", "欸我剛邊聽邊記了一下重點，", "照我剛記下來的發言順序來看，", "我們直接對一下剛剛大家講的細節，"],
    rebutLead: ["欸慢著，你要踩我總要講根據吧，", "等一下，這波懷疑完全對不上事實，"],
    dualLead: ["現在兩位觀察員對跳嘛，我把剛記的兩邊狼坑攤開來比，", "雙觀察員衝突很好抓，我們直接核對兩邊的狼坑邏輯，"],
    signoff: ["細節我先記到這邊。", "後面聽完再對一次。", ""],
    reactGasp: ["欸你的根據在哪？", "別沒證據亂扣帽子喔"],
    reactVouch: ["沒錯，細節對得上！", "謝謝幫我講公道話"],
    reactNod: ["時間點完全對得上", "這段講得很實在"],
    reactDoubt: ["前後說詞有時間差喔…", "這邊明顯在閃重點"]
  },
  "阿竹": {
    lead: ["且慢，", "聽完這一輪，我有幾句想說：", "這盞茶喝到這，", "慢著，這杯凍頂茶還沒涼，我先理一理：", "細品前面幾番對答，端倪差不多出來了：", "聽其言觀其行，我先說說我的看法："],
    rebutLead: ["慢著慢著，這杯苦茶可潑錯人了——", "咦，這頂帽子扣得未免太急了吧——"],
    dualLead: ["席間同時有兩位明心觀察員，我把雙邊狼坑並列對照一下：", "茶湯清濁正好立判，我直接對比兩位觀察員的坑位："],
    signoff: ["茶還沒涼，先聽下位高見。", "點到為止，換後面聊。", ""],
    reactGasp: ["這可真是冤枉…", "潑錯茶湯囉！"],
    reactVouch: ["知音難尋！", "謝同窗仗義執言！"],
    reactNod: ["說得在理！", "清風明辨！"],
    reactDoubt: ["茶味微澀有蹊蹺…", "詞鋒略顯急躁"]
  },
  "晨晨": {
    lead: ["老實講，", "這輪很清楚啊，", "講白一點，", "欸兄弟們聽我講兩句，", "老實講剛剛聽下來破綻滿明顯的耶，", "我直接講重點不拐彎抹角，"],
    rebutLead: ["喂不是吧，怎麼突然踩到自己人頭上啦，", "欸等一下這鍋我不背喔，"],
    dualLead: ["現在兩個人搶明心觀察員嘛，我直接拆兩邊狼坑給大家看，", "雙觀察員對決很清楚啊，我們直接比兩邊誰合理，"],
    signoff: ["我就直說到這邊啦。", "換後位接棒聊聊。", ""],
    reactGasp: ["喂看清楚再踩啦！", "別誤傷隊友啊！"],
    reactVouch: ["謝啦好兄弟！", "夠義氣懂我！"],
    reactNod: ["講得超乾脆贊同！", "沒錯就是這樣！"],
    reactDoubt: ["講話一直閃喔…", "這破綻有點大耶"]
  },
  "墨白": {
    lead: ["簡言之，", "直說幾句：", "就事論事，", "對照前面幾位的說法，脈絡漸明了：", "把剛才的發言順一遍，是非其實很清楚：", "我直接說結論："],
    rebutLead: ["慢著，這指控毫無實據——", "下定論之前，先把憑據拿出來——"],
    dualLead: ["場上雙現明心觀察員，我直接用排除法對照兩邊狼坑：", "既然對跳，就該權衡兩端坑位辨明真偽："],
    signoff: ["點到為止。", "看法如上，聽後位怎麼說。", ""],
    reactGasp: ["無憑妄斷。", "切莫顛倒黑白。"],
    reactVouch: ["所見略同。", "多謝明辨。"],
    reactNod: ["條理分明。", "持論公允。"],
    reactDoubt: ["前後失衡…", "語氣略顯虛浮"]
  },
  "晴嵐": {
    lead: ["輕聲說，", "聽完大家這一段，", "我想輕聲補個線索，", "靜靜聽完大家剛才聊的，晴嵐試著理一下：", "順著前面幾位的語氣聽下來：", "我輕輕幫大家把脈絡順一遍："],
    rebutLead: ["咦，怎麼話題突然轉到我身上了——", "大家先別急，聽晴嵐慢慢澄清——"],
    dualLead: ["兩位明心觀察員各有說法，我把雙邊狼坑攤開細看：", "雙邊對跳最忌心亂，晴嵐把兩條線並列給大家參考："],
    signoff: ["以上供大家參考。", "接著聽後面幾位怎麼說吧。", ""],
    reactGasp: ["咦，怕是聽錯意思了？", "晴嵐清白可辨呀"],
    reactVouch: ["謝謝同窗相護～", "有人懂這段真好！"],
    reactNod: ["言辭溫雅有理", "語氣清正誠懇"],
    reactDoubt: ["弦外略顯急躁…", "這段聽起來有點走調"]
  },
  "阿朗": {
    lead: ["講重點，", "講最核心的一點，", "直接對證點，", "欸我直接抓剛剛最核心的爭點，", "我們把前面的證據跟邏輯攤開來看，", "先順一下剛剛幾位的說法哪裡有矛盾，"],
    rebutLead: ["欸等一下我提出異議，這指控根本站不住腳啊，", "你要懷疑我總要先拿出證據吧，"],
    dualLead: ["現在兩張觀察員正面撞上嘛，我們直接並排比對兩邊狼坑的證據，", "雙觀察員對跳看誰邏輯有漏洞最準，兩邊這樣比，"],
    signoff: ["照證據跟邏輯投就好。", "你待會記得回應這個爭點。", ""],
    reactGasp: ["異議！這推論不通吧！", "請先拿出證據好嗎！"],
    reactVouch: ["沒錯，邏輯對上了！", "謝謝理性分析！"],
    reactNod: ["這段推論很紮實", "切中重點了！"],
    reactDoubt: ["這邊在偷換概念喔…", "完全沒回核心問題耶"]
  },
  "柚子": {
    lead: ["等一下喔，", "唔…柚子剛聽完有點疑惑，", "對照了一下剛剛的態度，", "我剛聽出來一個落差，", "我先講剛才注意到的細節，", "欸我先說我剛聽完的想法，"],
    rebutLead: ["咦，怎麼突然懷疑到柚子頭上啦，", "等一下喔，這推論跟事實對不上吧，"],
    dualLead: ["兩位觀察員撞在一起了，我們直接把兩邊視角跟票型擺出來對，", "雙觀察員對跳看清楚點，把兩邊邏輯和跟票位攤開比就對了，"],
    signoff: ["後面接著聊。", "先盯緊剛剛這幾位。", ""],
    reactGasp: ["咦，這太冤枉了吧！", "才不是柚子呢！"],
    reactVouch: ["耶謝謝相信我！", "這波站對了！"],
    reactNod: ["講得好清楚喔贊成！", "嗯嗯我也這樣覺得！"],
    reactDoubt: ["態度前後差太多了吧…", "剛剛是不是有點閃躲？"]
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
