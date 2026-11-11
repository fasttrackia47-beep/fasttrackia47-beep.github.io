(()=>{
 const root=document.querySelector('#form-root');
 const api='https://katya-matrix-sokolovamatrix.msk1.amvera.tech/api/form';
 const params=new URLSearchParams(location.search);
 const token=(params.get('token')||'').trim();
 const isPreview=(location.hostname==='127.0.0.1'||location.hostname==='localhost')&&token==='preview';
 const questions=[
  {id:'q1',title:'Что вам сейчас особенно важно прояснить?',description:'Опишите главный вопрос, с которым вы приходите в этот разбор.',min:20,max:600,placeholder:'Расскажите, что сейчас волнует вас больше всего…'},
  {id:'q2',title:'Расскажите немного о своей ситуации',description:'Добавьте детали и контекст — не менее 100 символов.',min:100,max:1200,placeholder:'Что происходит сейчас, что уже пробовали и к какому результату хотите прийти?'},
  {id:'q3',title:'Что вы хотите получить от разбора?',description:'Опишите, какие ответы, опору или направление хотите увидеть.',min:20,max:600,placeholder:'Какой результат разбора будет для вас действительно полезным?'},
 ];
 const state={stage:'loading',product:window.MATRIX_PRODUCT_TITLE||'Персональный разбор',day:'',month:'',year:'',question:0,answers:{},error:'',message:'',submitting:false};
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
 const frame=(body,label='Анкета для разбора',showBack=true)=>`<div class="meta">${showBack?'<button class="text-back" data-action="back">← Назад</button>':'<span></span>'}<span>${escape(label)}</span></div><section class="stage">${body}</section>`;
 const error=()=>state.error?`<p class="error" role="alert">${escape(state.error)}</p>`:'';
 const statusScreen=(title,message)=>frame(`<h1>${escape(title)}</h1><p class="lead">${escape(message)}</p>`,'');
 function render(){
  root.classList.toggle('gate',state.stage==='gate'||state.stage==='loading'||state.stage==='blocked');
  if(state.stage==='loading')root.innerHTML=statusScreen('Проверяем ссылку','Это займёт несколько секунд.');
  if(state.stage==='blocked')root.innerHTML=statusScreen(state.message||'Не удалось открыть анкету','Если вы считаете, что это ошибка, вернитесь в Telegram и запросите новую ссылку.');
  if(state.stage==='gate')root.innerHTML=frame(`<h1>Анкета «${escape(state.product)}»</h1><p class="gate-guidance"><strong>Заполнение займёт 10–15 минут.</strong> Выберите спокойное, уединённое место, чтобы вдумчиво и подробно ответить на вопросы.</p><button class="primary" data-action="enter">Открыть анкету <span>→</span></button>`,state.product);
  if(state.stage==='date')root.innerHTML=frame(`<h1>Укажите дату рождения</h1><p class="lead">Дата нужна для расчёта матрицы. Проверьте её перед продолжением.</p><div class="date-grid"><label>День<input class="field" id="day" inputmode="numeric" maxlength="2" placeholder="ДД" value="${escape(state.day)}"></label><label>Месяц<input class="field" id="month" inputmode="numeric" maxlength="2" placeholder="ММ" value="${escape(state.month)}"></label><label>Год<input class="field" id="year" inputmode="numeric" maxlength="4" placeholder="ГГГГ" value="${escape(state.year)}"></label></div>${error()}<button class="primary" data-action="date">Продолжить <span>→</span></button>`,'Шаг 1 из 4');
  if(state.stage==='question'){
   const q=questions[state.question],answer=state.answers[q.id]||'';
   root.innerHTML=frame(`<h1>${escape(q.title)}</h1><p class="lead">${escape(q.description)}</p><label class="label" for="answer">Ваш ответ</label><textarea id="answer" maxlength="${q.max}" placeholder="${escape(q.placeholder)}">${escape(answer)}</textarea><span class="count">${answer.length} / ${q.max}</span>${error()}<button class="primary" data-action="question">Продолжить <span>→</span></button>`,`Шаг ${state.question+2} из 4`);
  }
  if(state.stage==='summary')root.innerHTML=frame(`<span class="kicker">ПРОВЕРКА ОТВЕТОВ</span><h1>Всё готово к отправке</h1><p class="lead">Проверьте данные. После отправки изменить их будет нельзя.</p><div class="summary"><div><span>Дата рождения</span><strong>${escape(formatDate())}</strong></div>${questions.map(q=>`<div><span>${escape(q.title)}</span><strong>${escape(state.answers[q.id])}</strong></div>`).join('')}</div><div class="actions"><button class="secondary" data-action="edit">Править ответы</button><button class="primary" data-action="submit">Да, всё верно <span>→</span></button></div>`,'Проверка',false);
  if(state.stage==='sending')root.innerHTML=frame(`<div class="status-center"><span class="kicker">ПОЧТИ ГОТОВО</span><h1>Отправляем ваши ответы</h1><p class="lead">Проверяем данные и передаём анкету на подготовку разбора.</p><div class="send-progress" role="progressbar" aria-label="Отправка анкеты"><i></i></div><small>Обычно это занимает несколько секунд.</small></div>`,'',false);
  if(state.stage==='submitError')root.innerHTML=frame(`<div class="status-center"><span class="kicker">НЕ УДАЛОСЬ ОТПРАВИТЬ</span><h1>Что-то пошло не так</h1><p class="lead">${escape(state.error||'Проверьте интернет и попробуйте ещё раз.')}</p><div class="actions"><button class="secondary" data-action="edit">Править ответы</button><button class="primary" data-action="submit">Попробовать ещё раз <span>→</span></button></div></div>`,'',false);
  if(state.stage==='final')root.innerHTML=frame(`<div class="status-center"><div class="success">✓</div><h1>Данные успешно отправлены</h1><p class="lead">В течение нескольких дней вы получите разбор на почту, указанную в Telegram-боте.</p><div class="help-box"><strong>Если письмо не придёт</strong><p>Напишите мне — я проверю отправку и помогу.</p><a href="https://www.instagram.com/kati.sokolova/" target="_blank" rel="noopener noreferrer">Написать в Instagram ↗</a></div></div>`,'Готово',false);
 }
 function formatDate(){return `${state.day.padStart(2,'0')}.${state.month.padStart(2,'0')}.${state.year}`}
 function isoDate(){return `${state.year}-${state.month.padStart(2,'0')}-${state.day.padStart(2,'0')}`}
 function validDate(){const d=Number(state.day),m=Number(state.month),y=Number(state.year),date=new Date(Date.UTC(y,m-1,d)),now=new Date();return d>0&&m>0&&/^\d{4}$/.test(state.year)&&y>=1920&&y<=now.getFullYear()&&date.getUTCDate()===d&&date.getUTCMonth()+1===m&&date.getUTCFullYear()===y&&date<=now}
 async function checkToken(){
  if(isPreview){state.stage='gate';render();return}
  if(!token){state.stage='blocked';state.message='Ссылка недействительна';render();return}
  try{
   const response=await fetch(`${api}/status?token=${encodeURIComponent(token)}`);
   const data=await response.json().catch(()=>({}));
   if(response.ok&&data.ok){state.product=data.productTitle||state.product;document.title=`Анкета «${state.product}»`;state.stage='gate'}
   else if(data.reason==='already_submitted'){state.stage='blocked';state.message=data.message||'Анкета уже отправлена'}
   else if(data.reason==='not_paid'){state.stage='blocked';state.message=data.message||'Оплата ещё не подтверждена'}
   else{state.stage='blocked';state.message=data.message||'Ссылка недействительна'}
  }catch{state.stage='blocked';state.message='Не удалось проверить ссылку. Попробуйте ещё раз позже'}
  render();
 }
 root.addEventListener('input',event=>{const target=event.target;if(target.id==='day')state.day=target.value.replace(/\D/g,'');if(target.id==='month')state.month=target.value.replace(/\D/g,'');if(target.id==='year')state.year=target.value.replace(/\D/g,'');if(target.id==='answer'){state.answers[questions[state.question].id]=target.value;const count=root.querySelector('.count');if(count)count.textContent=`${target.value.length} / ${questions[state.question].max}`}state.error=''});
 root.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;state.error='';
  if(action==='enter'){state.stage='date';render();return}
  if(action==='date'){if(!validDate())state.error='Проверьте дату: день, месяц и год должны быть настоящими.';else state.stage='question';render();return}
  if(action==='question'){const q=questions[state.question],value=(state.answers[q.id]||'').trim();if(value.length<q.min)state.error=`Напишите не менее ${q.min} символов.`;else if(state.question<questions.length-1)state.question++;else state.stage='summary';render();return}
  if(action==='edit'){state.stage='question';state.question=0;render();return}
  if(action==='submit'){
   state.submitting=true;state.stage='sending';render();
   if(isPreview){await new Promise(resolve=>setTimeout(resolve,1100));state.stage='final';state.submitting=false;render();return}
   try{
    const response=await fetch(`${api}/submit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,dateOfBirth:isoDate(),answers:{q1:state.answers.q1,q2:state.answers.q2,q3:state.answers.q3}})});
    const data=await response.json().catch(()=>({}));
    if(response.ok&&data.ok)state.stage='final';
    else{state.error=data.message||(data.reason==='not_paid'?'Оплата ещё не подтверждена':'Не удалось отправить анкету. Попробуйте ещё раз.');state.submitting=false;state.stage='submitError'}
   }catch{state.error='Не удалось отправить анкету. Проверьте интернет и попробуйте ещё раз.';state.submitting=false;state.stage='submitError'}
   render();return;
  }
  if(action==='back'){if(state.stage==='date')state.stage='gate';else if(state.stage==='question'&&state.question===0)state.stage='date';else if(state.stage==='question')state.question--;else if(state.stage==='summary'){state.stage='question';state.question=questions.length-1}render()}
 });
 render();checkToken();
})();
