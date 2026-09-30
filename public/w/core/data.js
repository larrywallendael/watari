/* WATARI - dummy personas + scenarios (single source of truth for all variants)
   Step times `at` are ms from scenario start. All figures are illustrative dummy data. */
window.WATARI = window.WATARI || {};

WATARI.sources = {
  card:      {icon:'credit-card',        label:'Card payment',          color:'#0b3b7a', bg:'#e6eefb'},
  transfer:  {icon:'arrow-left-right',   label:'Transfer',              color:'#0b3b7a', bg:'#e6eefb'},
  inflow:    {icon:'arrow-down-left',    label:'Incoming payment',      color:'#067647', bg:'#e9f9f0'},
  expected:  {icon:'clock-alert',        label:'Expected, not seen',    color:'#b54708', bg:'#fff4e5'},
  insurance: {icon:'shield-check',       label:'KBC Insurance',         color:'#036b95', bg:'#e3f6fd'},
  location:  {icon:'map-pin',            label:'Location (consented)',  color:'#c4232a', bg:'#fff0f0'},
  app:       {icon:'smartphone',         label:'KBC Mobile behaviour',  color:'#5b4bd6', bg:'#f1efff'},
  chat:      {icon:'message-circle',     label:'Kate chat history',     color:'#5b4bd6', bg:'#f1efff'},
  docs:      {icon:'file-text',          label:'Documents',             color:'#34435a', bg:'#eef1f6'},
  energy:    {icon:'zap',                label:'Energy',                color:'#b54708', bg:'#fff4e5'},
  household: {icon:'users',              label:'Household link',        color:'#c11574', bg:'#fdf2fa'},
  gov:       {icon:'landmark',           label:'Public data',           color:'#34435a', bg:'#eef1f6'},
  partner:   {icon:'store',              label:'Partner data',          color:'#067647', bg:'#e9f9f0'}
};

WATARI.channels = {
  push:      {icon:'bell-ring',      label:'Lock screen'},
  whatsapp:  {icon:'message-circle', label:'WhatsApp'},
  mail:      {icon:'mail',           label:'Mail'},
  call:      {icon:'phone-call',     label:'Call'},
  browser:   {icon:'globe',          label:'Browser'},
  messenger: {icon:'send',           label:'Messenger'},
  silence:   {icon:'moon',           label:'Silence'}
};

WATARI.moods = {
  idle:      {c1:'#00aeef', c2:'#6d8cff', speed:.0022, amp:.05, label:'Listening'},
  energetic: {c1:'#00aeef', c2:'#2f6bff', speed:.0065, amp:.12, label:'Energetic'},
  joy:       {c1:'#ff8fb1', c2:'#ffb547', speed:.005,  amp:.10, label:'Celebrating'},
  calm:      {c1:'#8b7cf6', c2:'#b8c7ff', speed:.0009, amp:.03, label:'Quiet, empathetic'},
  urgent:    {c1:'#ff5a5f', c2:'#ff9f43', speed:.009,  amp:.16, label:'Urgent'},
  focus:     {c1:'#12b76a', c2:'#00aeef', speed:.004,  amp:.07, label:'Focused'}
};

/* stat keys shared by every persona */
WATARI.statDefs = {
  customer: [
    {k:'time',  label:'Time saved',      unit:'min', max:600,   icon:'timer'},
    {k:'money', label:'Money saved',     unit:'€/yr',max:3000,  icon:'piggy-bank'},
    {k:'admin', label:'Open admin tasks',unit:'',    max:12,    icon:'list-todo', lowerIsBetter:true},
    {k:'peace', label:'Peace of mind',   unit:'/100',max:100,   icon:'heart'}
  ],
  kbc: [
    {k:'churn', label:'Churn risk',      unit:'%',   max:50,    icon:'door-open', lowerIsBetter:true},
    {k:'assets',label:'Money at KBC',    unit:'€',   max:400000,icon:'landmark'},
    {k:'products',label:'Products held', unit:'',    max:10,    icon:'layers'},
    {k:'trust', label:'Relationship',    unit:'/100',max:100,   icon:'handshake'}
  ]
};

WATARI.personas = {
  lotte:{ name:'Lotte Peeters', first:'Lotte', age:31, tag:'Designer · buying first flat', city:'Gent → Leuven',
    look:{skin:'#f3cfb3', hair:'#c98a4b', style:'long', bg:'#dff3fd', shirt:'#0b3b7a'},
    household:[], quote:'"I just want the move to be done."',
    stats:{customer:{time:0,money:0,admin:9,peace:42}, kbc:{churn:21,assets:38000,products:3,trust:61}} },
  karim:{ name:'Karim El Amrani', first:'Karim', age:52, tag:'Teacher · lost his mother', city:'Antwerpen',
    look:{skin:'#c69274', hair:'#2b2b2b', style:'short', bg:'#efeaff', shirt:'#4b5563', beard:true},
    household:[{n:'S', c:'#8b7cf6', name:'Sister'}], quote:'"I can\'t deal with paperwork right now."',
    stats:{customer:{time:0,money:0,admin:11,peace:18}, kbc:{churn:34,assets:312000,products:4,trust:58}} },
  maes:{ name:'Sofie & Jonas Maes', first:'Sofie', age:33, tag:'Young parents · baby Mila', city:'Mechelen',
    look:{skin:'#f6d5bd', hair:'#5a3a22', style:'bun', bg:'#fdf2fa', shirt:'#c11574'},
    household:[{n:'J', c:'#0b3b7a', name:'Jonas'}], quote:'"No sleep, no time, lots of new costs."',
    stats:{customer:{time:0,money:0,admin:7,peace:35}, kbc:{churn:12,assets:54000,products:5,trust:66}} },
  arne:{ name:'Arne Claes', first:'Arne', age:24, tag:'First job · wants FIRE', city:'Leuven',
    look:{skin:'#f1c7a5', hair:'#1f1a17', style:'short', bg:'#e9f9f0', shirt:'#067647'},
    household:[], quote:'"Retire at 45. No idea where to start."',
    stats:{customer:{time:0,money:0,admin:3,peace:50}, kbc:{churn:38,assets:2100,products:1,trust:44}} },
  nina:{ name:'Nina Jacobs', first:'Nina', age:28, tag:'Consultant · subscription creep', city:'Brussel',
    look:{skin:'#8d5b3e', hair:'#1b1210', style:'long', bg:'#fff4e5', shirt:'#b54708'},
    household:[], quote:'"Wait, I\'m still paying for that?"',
    stats:{customer:{time:0,money:0,admin:4,peace:55}, kbc:{churn:17,assets:9400,products:2,trust:57}} },
  marc:{ name:'Marc Wouters', first:'Marc', age:58, tag:'Landlord · one rental flat', city:'Hasselt',
    look:{skin:'#efc9ab', hair:'#b9bcc2', style:'short', bg:'#eef1f6', shirt:'#34435a'},
    household:[{n:'A', c:'#f79009', name:'Tenant Alexis'}], quote:'"Chasing rent is awkward."',
    stats:{customer:{time:0,money:0,admin:2,peace:60}, kbc:{churn:9,assets:186000,products:6,trust:72}} },
  els:{ name:'Els Janssens', first:'Els', age:49, tag:'Mother of Tibo (19)', city:'Brugge',
    look:{skin:'#f4d2b8', hair:'#8a5a3b', style:'bun', bg:'#fff0f0', shirt:'#c4232a'},
    household:[{n:'T', c:'#00aeef', name:'Tibo, 19'}], quote:'"Just tell me he\'s okay."',
    stats:{customer:{time:0,money:0,admin:1,peace:70}, kbc:{churn:11,assets:97000,products:5,trust:69}} }
};

WATARI.baseBrain = {
  lotte:[{l:'Works in Brussels, train',g:'life'},{l:'Salary €3.4k, 25th',g:'money'},{l:'Renting in Gent',g:'home'},{l:'My Terms: life events ✓',g:'consent'},{l:'Prefers bundles',g:'pref'}],
  karim:[{l:'Proxy on mother\'s account',g:'family'},{l:'Prefers phone, not app',g:'pref'},{l:'Sister in Antwerpen',g:'family'},{l:'My Terms: life events ✓',g:'consent'}],
  maes:[{l:'Joint account',g:'money'},{l:'Mortgage KBC 2021',g:'home'},{l:'Due date ~mid Sep',g:'life'},{l:'WhatsApp opted in',g:'consent'}],
  arne:[{l:'Student account',g:'money'},{l:'Asked Kate about ETFs',g:'pref'},{l:'Graduated June',g:'life'},{l:'Mail opted in',g:'consent'}],
  nina:[{l:'3 streaming services',g:'money'},{l:'Gym: Basic-Fit',g:'life'},{l:'Browser agent ✓',g:'consent'}],
  marc:[{l:'Rental flat Hasselt',g:'home'},{l:'Alexis pays on the 1st',g:'money'},{l:'14 months on time',g:'money'},{l:'Messenger linked',g:'consent'}],
  els:[{l:'Tibo on family plan',g:'family'},{l:'Tibo: student in Brussel',g:'family'},{l:'Emergency contact: Els',g:'consent'}]
};
WATARI.groupColors = {life:'#00aeef', money:'#12b76a', home:'#0b3b7a', consent:'#8b7cf6', pref:'#f79009', family:'#c11574', event:'#ff4d6d'};

WATARI.scenarios = [
 { id:'move', persona:'lotte', title:'Moving house', icon:'truck', tone:'Fast, proactive', ch:'push',
   headline:'5 weak signals → 1 life event → 1 tap',
   steps:[
    {at:600,  type:'signal', src:'transfer', t:'Notary Van Damme', s:'Down payment, flat Leuven', amt:-24000},
    {at:2300, type:'signal', src:'card',     t:'Verhuisfirma Mertens', s:'Removal firm, deposit', amt:-1180},
    {at:3900, type:'signal', src:'energy',   t:'Fluvius', s:'Final meter reading Gent', amt:-212},
    {at:5300, type:'signal', src:'location', t:'Evenings in Leuven', s:'9 of last 14 days'},
    {at:6600, type:'signal', src:'insurance', t:'Tenant policy Gent', s:'Ends with the old lease'},
    {at:8200, type:'fuse', label:'Life event: moving house', conf:.94, mood:'energetic', why:'Notary deposit (12 Oct), removal firm payment, Fluvius final bill'},
    {at:9400, type:'brain', nodes:[{l:'Flat Leuven, Bondgenotenlaan',g:'event'},{l:'Move date ~1 Nov',g:'event'},{l:'Parks on street',g:'life'}]},
    {at:10800,type:'route', pick:'push', why:'Tue 19:10 · phone unlocked, at home · consent: life events', options:{push:.92,whatsapp:.61,mail:.34,call:.04}},
    {at:12000,type:'deliver', ch:'push', msg:{
       title:'Congrats on the move to Leuven, Lotte.', body:'I prepared 4 things. Everything is pre-filled.',
       items:['Address change at KBC + KBC Insurance','Home insurance quote, Leuven flat, <b>€19/mo</b>','Fluvius transfer on 1 Nov','Parking zone Leuven in KBC Mobile'],
       ctas:['Approve all','Pick','Not now'], why:'Why? Notary deposit (12 Oct), removal firm payment, Fluvius final bill. You allowed "life events" in My Terms.'}},
    {at:15200,type:'action', label:'Approve all', persona:'happy'},
    {at:16000,type:'effect', customer:{time:220,admin:-9,peace:+38,money:+140}, kbc:{churn:-15,products:+1,assets:+2400,trust:+14}, hearts:9, coins:3},
    {at:17400,type:'admin', items:['Address updated · KBC + KBC Insurance','Home insurance active 1 Nov','Fluvius contract moved','Parking permit Leuven']},
    {at:19800,type:'learn', l:'Approves bundles in the evening'},
    {at:21500,type:'end'}
   ]},
 { id:'grief', persona:'karim', title:'Bereavement', icon:'flower-2', tone:'Quiet, empathetic', ch:'mail',
   headline:'The agent slows down, mutes, and offers to carry the load',
   steps:[
    {at:600,  type:'signal', src:'transfer', t:'Uitvaartzorg De Smet', s:'Funeral services', amt:-4850},
    {at:2400, type:'signal', src:'card',     t:'Bloemen Flora', s:'Florist, Antwerpen', amt:-180},
    {at:4100, type:'signal', src:'expected', t:'Pension to mother\'s account', s:'Stopped, first time in 9 yrs'},
    {at:5700, type:'signal', src:'app',      t:'Opened mother\'s account', s:'6× this week, no action'},
    {at:7600, type:'fuse', label:'Bereavement · sensitive moment', conf:.91, mood:'calm', why:'Funeral payment, florist, pension stopped on the account you manage'},
    {at:8900, type:'mute', items:['3 promo pushes','Credit card campaign','NPS survey'], label:'Paused for 30 days'},
    {at:10400,type:'brain', nodes:[{l:'Mother passed ~20 Sep',g:'event'},{l:'Estate: savings + flat',g:'event'},{l:'Do not sell for 30 days',g:'pref'}]},
    {at:11800,type:'route', pick:'mail', why:'No push. Wait 5 days. Saturday 10:00, soft tone. Human follow-up offered.', options:{push:.02,whatsapp:.08,mail:.81,call:.35}},
    {at:13200,type:'deliver', ch:'mail', msg:{
       from:'Patrick · KBC estate adviser', subject:'We\'re here, whenever you\'re ready',
       body:'Karim, we\'re very sorry for your loss. There is nothing you need to do today. If it helps, we can take these off your hands:',
       items:['Register the death with all Belgian banks (Febelfin)','Stop your mother\'s direct debits','Open one estate account for the notary','Visit at home, or a call, no rush'],
       ctas:['Let Patrick call me','Not now'], why:'Why? A funeral payment and a stopped pension on the account you manage. All promotions are paused.'}},
    {at:17200,type:'action', label:'Let Patrick call me', persona:'relieved'},
    {at:18000,type:'effect', customer:{time:360,admin:-11,peace:+34}, kbc:{churn:-25,trust:+22}, hearts:7, coins:0, note:'No sale. Trust first. €312k estate stays in the family\'s KBC relationship.'},
    {at:19400,type:'admin', items:['Febelfin death registration sent','4 direct debits stopped','Estate account prepared','Call booked Tue 14:00']},
    {at:21600,type:'learn', l:'Tone: soft, human, no promos'},
    {at:23200,type:'end'}
   ]},
 { id:'baby', persona:'maes', title:'New baby', icon:'baby', tone:'Joyful', ch:'whatsapp',
   headline:'A new ball joins the household',
   steps:[
    {at:600,  type:'signal', src:'card',     t:'AZ Sint-Maarten', s:'Maternity ward', amt:-640},
    {at:2100, type:'signal', src:'inflow',   t:'Groeipakket · kraamgeld', s:'Birth allowance', amt:1227},
    {at:3600, type:'signal', src:'card',     t:'Dreambaby', s:'Stroller + car seat', amt:-420},
    {at:5000, type:'signal', src:'card',     t:'Kruidvat', s:'Diapers, 3rd time in 10 days', amt:-38},
    {at:6800, type:'fuse', label:'New family member', conf:.97, mood:'joy', why:'Maternity bill, Groeipakket birth allowance, baby shop payments'},
    {at:7800, type:'household', add:{n:'M', c:'#ff8fb1', name:'Mila, 2 wks'}},
    {at:8800, type:'brain', nodes:[{l:'Mila, born 14 Sep',g:'event'},{l:'Household: 3',g:'family'},{l:'Diapers ~€70/mo',g:'money'}]},
    {at:10200,type:'route', pick:'whatsapp', why:'Sunday 11:00 · both parents in one chat · no work hours', options:{push:.55,whatsapp:.88,mail:.4,call:.02}},
    {at:11400,type:'deliver', ch:'whatsapp', msg:{
       contact:'KBC · Kate', thread:[
        {f:'in', t:'Congrats on Mila! 🎉 Welcome to the family, Sofie & Jonas.'},
        {f:'in', t:'3 things are ready, all pre-filled:\n1. Mila\'s savings account: €25/mo → ~€7.1k at 18\n2. Add Mila to your family insurance: +€0\n3. Baby budget pot: €70/mo for diapers'},
       ], quick:['Yes, set up all 3','Make it €50/mo','Later'], reply:'Yes, set up all 3 🙌', why:'Why? Maternity bill + Groeipakket birth allowance.'}},
    {at:14600,type:'action', label:'Yes, set up all 3', persona:'happy'},
    {at:15400,type:'effect', customer:{time:150,admin:-7,peace:+30,money:+300}, kbc:{products:+2,assets:+300,churn:-6,trust:+15}, hearts:8, coins:4, note:'A customer for 18+ years, from day 14.'},
    {at:16800,type:'admin', items:['Savings account Mila opened','Family insurance updated','Baby pot €70/mo live']},
    {at:19000,type:'learn', l:'Family decisions: both parents'},
    {at:20600,type:'end'}
   ]},
 { id:'job', persona:'arne', title:'First job · FIRE', icon:'rocket', tone:'Ambitious', ch:'mail',
   headline:'Money that sits still gets a plan',
   steps:[
    {at:600,  type:'signal', src:'inflow',   t:'First salary · Accenture', s:'Via SD Worx payroll', amt:2640},
    {at:2200, type:'signal', src:'transfer', t:'Trade Republic', s:'Outgoing to broker', amt:-200},
    {at:3800, type:'signal', src:'chat',     t:'"How do ETFs work?"', s:'Kate chat, 2 weeks ago'},
    {at:5200, type:'signal', src:'docs',     t:'Student account still open', s:'Idle balance €2.1k'},
    {at:7000, type:'fuse', label:'Life stage: first job', conf:.96, mood:'focus', why:'First salary, money leaving to a broker, ETF questions'},
    {at:8200, type:'brain', nodes:[{l:'Goal: FIRE at 45',g:'pref'},{l:'Risk: dynamic',g:'pref'},{l:'Net pay €2,640',g:'money'}]},
    {at:9600, type:'route', pick:'mail', why:'Payday + 1, 08:10 on the train · planning content = mail', options:{push:.44,whatsapp:.3,mail:.86,call:.01}},
    {at:10800,type:'deliver', ch:'mail', msg:{
       from:'Kate · your monthly plan', subject:'Arne, your first-salary plan (FI at 46)',
       body:'Your first month, sorted into a 30/30/30/10 split. One tap and it runs every payday.',
       split:[{l:'Fixed costs',p:30,c:'#0b3b7a'},{l:'Life',p:30,c:'#00aeef'},{l:'Invest',p:30,c:'#12b76a'},{l:'Buffer',p:10,c:'#f79009'}],
       kpis:[{v:'€792/mo',l:'into ETF plan'},{v:'46',l:'FI age (was 53)'}],
       ctas:['Activate split','Adjust'], why:'Why? First salary on 25 Sep and €200 sent to a broker. Projection 6% nominal, illustrative.'}},
    {at:14200,type:'action', label:'Activate split', persona:'happy'},
    {at:15000,type:'effect', customer:{time:90,admin:-3,peace:+22,money:+420}, kbc:{churn:-24,products:+2,assets:+9500,trust:+18}, hearts:5, coins:6, note:'Investing flow stays at KBC instead of a neobroker.'},
    {at:16400,type:'admin', items:['Standing orders set for the 25th','ETF plan (Bolero) opened','Student account → Plus account']},
    {at:18400,type:'learn', l:'Monthly FIRE report by mail'},
    {at:20000,type:'end'}
   ]},
 { id:'subs', persona:'nina', title:'Subscription creep', icon:'repeat', tone:'Protective', ch:'browser',
   headline:'The agent shows up where you pay, not in an app',
   steps:[
    {at:600,  type:'signal', src:'card',     t:'Netflix', s:'Monthly', amt:-17.99},
    {at:2000, type:'signal', src:'card',     t:'Disney+ trial', s:'Converts in 3 days, 0 min watched', amt:-11.99},
    {at:3500, type:'signal', src:'location', t:'No gym check-in', s:'Basic-Fit, 7 weeks', amt:-29.99},
    {at:5000, type:'signal', src:'partner',  t:'Checkout: HBO Max', s:'Browser, now'},
    {at:6600, type:'fuse', label:'Unused subscriptions', conf:.89, mood:'focus', why:'3 streaming services, a trial about to convert, unused gym'},
    {at:7800, type:'brain', nodes:[{l:'Streaming €59.97/mo',g:'money'},{l:'Gym unused since Aug',g:'life'}]},
    {at:9000, type:'route', pick:'browser', why:'She is paying right now · decision happens at checkout', options:{push:.41,whatsapp:.2,mail:.12,browser:.95}},
    {at:10200,type:'deliver', ch:'browser', msg:{
       url:'hbomax.com/checkout', title:'Before you pay: 4th streaming service',
       items:['Disney+ trial converts Friday, 0 min watched','Basic-Fit €29.99, no visit in 7 weeks','Cancel both for you: <b>€503/yr</b> back'],
       ctas:['Cancel both for me','Keep'], why:'Why? Card data + gym location, both allowed in My Terms.'}},
    {at:13400,type:'action', label:'Cancel both for me', persona:'happy'},
    {at:14200,type:'effect', customer:{time:60,admin:-4,peace:+15,money:+503}, kbc:{churn:-7,trust:+12,assets:+500}, hearts:6, coins:1, note:'Saved money lands in her KBC savings pot.'},
    {at:15600,type:'admin', items:['Disney+ cancelled before conversion','Basic-Fit cancellation letter sent','€42/mo → savings pot']},
    {at:17600,type:'learn', l:'Warn at checkout, not after'},
    {at:19200,type:'end'}
   ]},
 { id:'rent', persona:'marc', title:'Missing rent', icon:'house', tone:'Tactful', ch:'messenger',
   headline:'Absence is also a signal',
   steps:[
    {at:600,  type:'signal', src:'expected', t:'Rent Alexis, €850', s:'Due on the 1st · day 5, not seen'},
    {at:2300, type:'signal', src:'docs',     t:'14 months on time', s:'Payment history'},
    {at:3900, type:'signal', src:'transfer', t:'Marc: mortgage rental flat', s:'Debited on the 6th', amt:-690},
    {at:5600, type:'fuse', label:'Missing inflow, mortgage due tomorrow', conf:.88, mood:'focus', why:'Rent not received on day 5, first time in 14 months'},
    {at:6800, type:'route', pick:'messenger', why:'Tone matters: friendly nudge from Marc, not from the bank', options:{push:.7,whatsapp:.5,mail:.2,messenger:.9}},
    {at:8000, type:'deliver', ch:'messenger', msg:{
       notif:'Alexis\' rent (€850) hasn\'t arrived. A friendly reminder is ready in Messenger.',
       contact:'Alexis', draft:'Hi Alexis! Small reminder, October rent hasn\'t come in yet. Here\'s a 1-tap link if that\'s easier 🙂 kbc.be/pay/…', ctas:['Send'], why:'Why? Rent is paid on the 1st for 14 months. Your mortgage is debited tomorrow.'}},
    {at:11200,type:'action', label:'Send', persona:'happy'},
    {at:12600,type:'signal', src:'inflow', t:'Alexis Dubois', s:'Rent October, 2h later', amt:850},
    {at:13600,type:'effect', customer:{time:40,admin:-2,peace:+20}, kbc:{assets:+850,trust:+9,churn:-3}, hearts:5, coins:2},
    {at:15000,type:'admin', items:['Rent matched to October','Mortgage covered, no overdraft']},
    {at:16800,type:'learn', l:'Alexis: 1-tap link works'},
    {at:18400,type:'end'}
   ]},
 { id:'family', persona:'els', title:'Son in trouble?', icon:'siren', tone:'Urgent', ch:'call',
   headline:'Some signals break Quiet Hours',
   steps:[
    {at:500,  type:'signal', src:'card',     t:'Tibo · ATM Marrakech', s:'03:12 tonight', amt:-400},
    {at:1700, type:'signal', src:'location', t:'Tibo last seen Brussel', s:'Phone, 2 hours ago'},
    {at:2900, type:'signal', src:'card',     t:'Tibo · 2nd attempt', s:'Declined, wrong PIN'},
    {at:4300, type:'fuse', label:'Possible card fraud or emergency', conf:.93, mood:'urgent', why:'Two countries within 2 hours, wrong PIN, 03:12'},
    {at:5300, type:'route', pick:'call', why:'Urgent overrides Quiet Hours · Els is Tibo\'s emergency contact', options:{push:.3,whatsapp:.2,mail:0,call:.97}},
    {at:6500, type:'deliver', ch:'call', msg:{
       caller:'KBC · Kate', sub:'About Tibo\'s card', lines:['Hi Els, sorry to wake you. Tibo\'s card was just used in Marrakech.','His phone was in Brussel 2 hours ago. I froze the card, nothing else left the account.','Is Tibo travelling?'],
       ctas:['He\'s home, keep blocked','He\'s travelling, unblock'], why:'Why? Two countries in 2 hours and a wrong PIN.'}},
    {at:10400,type:'action', label:'He\'s home, keep blocked', persona:'relieved'},
    {at:11200,type:'effect', customer:{money:+400,peace:+25,admin:-1,time:45}, kbc:{trust:+20,churn:-6}, hearts:6, coins:2, note:'Fraud refund avoided, new card to Tibo tomorrow.'},
    {at:12600,type:'admin', items:['Card blocked, €400 disputed','New card posted to Tibo','Tibo gets a WhatsApp at 08:00']},
    {at:14600,type:'learn', l:'Night calls OK for emergencies'},
    {at:16200,type:'end'}
   ]}
];
WATARI.scenario = id => WATARI.scenarios.find(s=>s.id===id);
