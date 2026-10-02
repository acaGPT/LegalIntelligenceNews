/* 数据校验成功才更新；正文使用 textContent，失败保留已加载内容。 */
(() => {
  const by_id = id => document.getElementById(id);
  const labels = {product:'产品',scenario:'场景',customer:'客户',deployment_status:'可用性 / 使用状态',outcome:'效果陈述',event_type:'交易类型',round:'轮次',round_amount:'单轮金额',cumulative_amount:'累计融资',valuation:'估值',currency:'币种',investors:'投资方',transaction_status:'交易状态',completed_on:'完成日期'};
  const source_labels = {issuer:'发行方公告',investor:'投资方陈述',customer:'客户自身陈述',media:'媒体报道',aggregator:'汇总来源',filing:'申报文件'};
  const pending_labels = {transaction_completion_not_verified:'交易完成尚未核实',customer_deployment_not_verified:'客户部署尚未核实',effectiveness_not_verified:'效果尚未核实'};
  const value_labels = {funding:'融资',acquisition:'收购',ipo:'上市',exit:'退出',compliance_risk_assessment:'合规风险评估',contract_portfolio_intelligence:'合同组合信息分析',contract_review:'合同审查',document_search_and_organization:'文档检索与组织',in_house_legal_workflows:'企业法务工作流',multi_step_in_house_legal_workflows:'企业法务多步骤工作流',customer_reported_use:'客户使用陈述（由发行方发布）',early_access_waitlist:'早期使用候选名单',general_availability_claim:'发行方宣称一般可用',mixed_launch_early_access_and_coming_soon:'混合状态：已发布、早期使用及即将推出',search_general_availability_organization_early_access:'Search 一般可用；Organization 早期使用',announced_funding:'融资公告',media_reported_fundraise:'媒体报道融资',announced_acquisition:'收购公告',reported_acquisition:'报道收购'};
  const category_labels={research:'科研与评测',product:'产品与能力',application:'应用突破',capital:'资本动向',partnership:'行业合作',governance:'治理与规范',industry:'行业观察'};
  const type_labels={research:'科研原件',institution:'司法 / 监管机构',issuer:'发行方公告',customer:'客户原件',investor:'投资方文件',media:'行业媒体',aggregator:'汇总来源',filing:'申报文件'};
  const category_of=row=>row.category||(row.kind==='transaction'?'capital':'application');
  let current = null;
  let revision = null;
  let loading = false;
  const node = (tag,text,cls) => {const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(cls)item.className=cls;return item;};
  const value_text = value => value===null?'未披露 / 未核实':Array.isArray(value)?value.join('、'):typeof value==='object'?JSON.stringify(value):String(value);
  const is_source_url = value => {try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&![...url.searchParams.keys()].some(k=>['token','access_token','api_key','auth','session','password'].includes(k.toLowerCase()));}catch{return false;}};

  function build_view(data) {
    const query=by_id('search').value.trim().toLocaleLowerCase();
    const kind=by_id('kind').value;
    const category_mode=Boolean(by_id('source')); // 缓存旧首页的“应用”仍按旧 kind 筛选。
    const registry=data.source_registry||[];
    const source=by_id('source')?.value||'all';
    const selected_source=source==='all'||registry.some(s=>s.source_id===source)?source:'all';
    const rows=data.records.filter(row=>(kind==='all'||(category_mode?category_of(row)===(kind==='transaction'?'capital':kind):row.kind===kind))&&(selected_source==='all'||row.sources.some(s=>s.registry_id===selected_source))&&JSON.stringify([row.company,row.title,row.fields,row.summary,row.publishers]).toLocaleLowerCase().includes(query));
    rows.sort((a,b)=>(b.announced_on||'').localeCompare(a.announced_on||'')||a.event_key.localeCompare(b.event_key));
    const cards=rows.map(row=>{
      const card=node('article',undefined,'card');
      const top=node('div',undefined,'card-top');top.append(node('span',category_labels[category_of(row)],'badge'),node('time',row.announced_on||'日期待核实'));card.append(top);
      card.append(node('h3',row.title),node('p','发布方：'+(row.publishers||[...new Set(row.sources.map(s=>s.source_owner))]).join('、'),'publisher'));
      const overview=node('section',undefined,'news-summary');overview.append(node('h4','新闻概要'),node('p',row.summary||`${row.company} 发布了有关 ${row.title} 的资讯。详情与证据状态见下方事实及来源。`));card.append(overview);
      card.append(node('span','相关机构：'+row.company,'company'));
      const facts=node('dl',undefined,'facts');
      for(const [key,value] of Object.entries(row.fields)){facts.append(node('dt',labels[key]||key),node('dd',value_labels[value]||value_text(value)));}card.append(facts);
      if(row.pending_reasons.length||Object.keys(row.conflicts).length){card.append(node('p',row.pending_reasons.map(item=>pending_labels[item]||item).join('；')+(Object.keys(row.conflicts).length?'；存在来源冲突，保留各方观测。':''),'pending'));}
      const links=node('div',undefined,'source-list');
      for(const source of row.sources){const registered=registry.find(s=>s.source_id===source.registry_id);const source_label=registered?type_labels[registered.source_type]:source_labels[source.source_kind];const link=node('a',`${source_label||'原文发布'} · ${source.source_owner} ↗`);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';links.append(link);}
      links.append(node('span','来源归属不等于独立核实；跨站转载不自动升级证据。','source-note'));card.append(links);return card;
    });
    const options=[node('option','全部来源')];options[0].value='all';
    const directory=[];
    for(const type of Object.keys(type_labels)){
      const entries=registry.filter(s=>s.source_type===type);if(!entries.length)continue;
      const group=node('section',undefined,'source-group');group.append(node('h3',type_labels[type]));
      for(const entry of entries){const item=node('div',undefined,'source-entry');const link=node('a',entry.name+' ↗');link.href=entry.url;link.target='_blank';link.rel='noopener noreferrer';item.append(link,node('span',`${entry.language==='zh'?'中文':entry.language==='en'?'英文':entry.language} · ${entry.record_count} 条 · ${entry.categories.map(c=>category_labels[c]).join(' / ')}`));group.append(item);}
      directory.push(group);
    }
    for(const entry of registry){const option=node('option',entry.name+' · '+entry.record_count+' 条');option.value=entry.source_id;options.push(option);}
    return {cards,count:rows.length,directory,options,selected_source};
  }

  function apply_view(data,view) {
    by_id('records').replaceChildren(...view.cards);
    const category_mode=Boolean(by_id('source'));
    by_id('application-count').textContent=category_mode?(data.counts.news??data.records.length):data.counts.applications;
    by_id('transaction-count').textContent=category_mode?new Set(data.records.map(category_of)).size:data.counts.transactions;
    by_id('document-count').textContent=data.counts.documents;
    by_id('company-count').textContent=category_mode?(data.source_registry?.length??data.source_domains?.length??data.companies.length):data.companies.length;
    if(by_id('source-directory'))by_id('source-directory').replaceChildren(...view.directory);
    if(by_id('source')){by_id('source').replaceChildren(...view.options);by_id('source').value=view.selected_source;}
    if(by_id('source-count'))by_id('source-count').textContent=`${data.source_registry?.length||0} 个已引用来源`;
    by_id('window').textContent=`资料窗口：${data.window.start} 至 ${data.window.end}。`;
    by_id('result-count').textContent=`显示 ${view.count} / ${data.records.length} 条`;
    by_id('empty').hidden=view.count!==0;
  }

  function render() {if(current)apply_view(current,build_view(current));}

  function validate_data(data) {
    const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
    const string=value=>typeof value==='string';
    const date=value=>string(value)&&/^\d{4}-\d{2}-\d{2}$/.test(value);
    const details={application:['product','scenario','customer','deployment_status','outcome'],news:[],transaction:['event_type','round','round_amount','cumulative_amount','valuation','currency','investors','transaction_status','completed_on']};
    if(!Array.isArray(data.records)||!Array.isArray(data.companies)||!data.companies.every(string)||!object(data.window)||!date(data.window.start)||!date(data.window.end)||!object(data.counts))throw new Error('资料结构不完整');
    for(const key of ['applications','transactions','documents','observations'])if(!Number.isSafeInteger(data.counts[key])||data.counts[key]<0)throw new Error('统计结构不完整');
    const keys=new Set();
    for(const row of data.records) {
      if(!object(row)||!['application','transaction',...(data.schema_version==='legal-ai-news-public/v2'?['news']:[])].includes(row.kind)||!string(row.event_key)||!row.event_key||keys.has(row.event_key)||!string(row.title)||!string(row.company)||(row.announced_on!==null&&!date(row.announced_on))||!object(row.fields)||!object(row.conflicts)||!Array.isArray(row.pending_reasons)||!row.pending_reasons.every(string)||!Array.isArray(row.sources)||!row.sources.every(s=>object(s)&&['source_kind','source_owner','independence_group','url'].every(key=>string(s[key]))&&is_source_url(s.url)))throw new Error('记录结构不完整');
      keys.add(row.event_key);
      if(Object.keys(row.fields).length!==details[row.kind].length||!details[row.kind].every(key=>Object.hasOwn(row.fields,key)))throw new Error('事实字段不完整');
      for(const [key,value] of Object.entries(row.fields))if(value!==null&&!(key==='investors'?Array.isArray(value)&&value.every(string):string(value)))throw new Error('事实类型不完整');
    }
    if(data.schema_version==='legal-ai-news-public/v2'){
      if(!object(data.category_counts)||!Array.isArray(data.source_registry)||data.counts.news!==data.records.length||data.counts.supplemental_news!==data.records.filter(r=>r.kind==='news').length)throw new Error('扩展统计不完整');
      const registry=new Map();
      for(const source of data.source_registry){if(!object(source)||!string(source.source_id)||!source.source_id||registry.has(source.source_id)||!string(source.name)||!source.name||!string(source.language)||!Object.hasOwn(type_labels,source.source_type)||!is_source_url(source.url)||!Array.isArray(source.categories)||!source.categories.length||!source.categories.every(c=>Object.hasOwn(category_labels,c))||!Number.isSafeInteger(source.record_count)||source.record_count<1)throw new Error('来源目录不完整');registry.set(source.source_id,source);}
      for(const row of data.records){if(!Object.hasOwn(category_labels,row.category)||!string(row.summary)||!row.summary.trim()||!Array.isArray(row.publishers)||!row.publishers.length||!row.publishers.every(string)||!row.sources.length)throw new Error('新闻概要不完整');
        if((row.kind==='transaction')!==(row.category==='capital'))throw new Error('交易分类不一致');
        const owners=[...new Set(row.sources.map(s=>s.source_owner))].sort();if(JSON.stringify(owners)!==JSON.stringify([...row.publishers].sort()))throw new Error('发布方与来源不一致');
        for(const source of row.sources){const entry=registry.get(source.registry_id);if(!entry||entry.name!==source.source_owner||new URL(entry.url).hostname!==new URL(source.url).hostname||!entry.categories.includes(row.category))throw new Error('来源未登记');}
      }
      for(const category of Object.keys(category_labels))if(data.category_counts[category]!==data.records.filter(r=>r.category===category).length)throw new Error('分类统计不一致');
      for(const entry of registry.values())if(entry.record_count!==data.records.filter(r=>r.sources.some(s=>s.registry_id===entry.source_id)).length)throw new Error('来源统计不一致');
    }
    for(const [kind,key] of [['application','applications'],['transaction','transactions']])if(data.records.filter(row=>row.kind===kind).length!==data.counts[key])throw new Error('统计与记录不一致');
  }

  async function refresh() {
    if(loading)return;loading=true;
    try {
      const pointer_response=await fetch(`revision.json?t=${Date.now()}`,{cache:'no-store'});
      if(!pointer_response.ok)throw new Error('版本暂不可用');
      const meta=await pointer_response.json();
      if(meta.schema_version!=='legal-ai-news-revision/v1'||!/^[a-f0-9]{64}$/.test(meta.revision)||meta.data_path!==`snapshots/${meta.revision}.json`||!/^[a-f0-9]{64}$/.test(meta.data_sha256))throw new Error('版本信息不完整');
      if(revision!==meta.revision){
        const response=await fetch(`${meta.data_path}?v=${meta.revision}`,{cache:'no-store'});
        if(!response.ok)throw new Error('新资料尚未同步');
        const text=await response.text();
        const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
        const digest=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
        const data=JSON.parse(text);
        if(digest!==meta.data_sha256||data.revision!==meta.revision||!['legal-ai-news-public/v1','legal-ai-news-public/v2'].includes(data.schema_version)||!Array.isArray(data.records)||!Array.isArray(data.companies)||!data.window||!data.counts)throw new Error('资料核验未通过');
        validate_data(data);
        const view=build_view(data);
        apply_view(data,view);current=data;revision=meta.revision;
      }
      by_id('update-status').textContent=`已检查更新 · ${new Date().toLocaleTimeString('zh-CN')}`;
    }catch(error){by_id('update-status').textContent=current?'更新暂未就绪，保留上次成功资料。':'暂未取得资料，请稍后检查更新。';}
    finally{loading=false;}
  }
  by_id('source')?.addEventListener('change',render);
  by_id('search').addEventListener('input',render);by_id('kind').addEventListener('change',render);by_id('refresh').addEventListener('click',refresh);
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  setInterval(refresh,60000);refresh();
})();
