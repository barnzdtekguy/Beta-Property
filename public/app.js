'use strict';
const SITE={name:'Beta Property',whatsapp:'2349079440776',message:'Hello Beta Property, I would like to enquire about property opportunities in Lagos and Abuja.',realtorRegistrationUrl:'/realtor/register'};
const realtorStyles=document.createElement('link');
realtorStyles.rel='stylesheet';
realtorStyles.href='/realtor.css';
document.head.appendChild(realtorStyles);
const whatsappUrl=`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(SITE.message)}`;
const realtorRegistrationUrl=SITE.realtorRegistrationUrl;
document.querySelectorAll('.whatsapp-link').forEach(link=>{link.href=whatsappUrl;link.target='_blank';link.rel='noopener noreferrer';});
const realtorCta=document.createElement('a');
realtorCta.className='button red realtor-cta';
realtorCta.href=realtorRegistrationUrl;
realtorCta.textContent='Register as a realtor';
document.querySelector('.header-actions').insertBefore(realtorCta,document.querySelector('.menu-toggle'));
const mobileRealtorLink=document.createElement('a');
mobileRealtorLink.className='realtor-mobile-link';
mobileRealtorLink.href=realtorRegistrationUrl;
mobileRealtorLink.textContent='Register as a realtor';
document.getElementById('mobile-nav').appendChild(mobileRealtorLink);
const path=window.location.pathname.replace(/\/+$/,'')||'/';
const isHome=path==='/';
if(!isHome){document.getElementById('homepage').hidden=true;document.getElementById('under-development').hidden=false;const titles={'about':'About us','services':'Our services','properties':'Properties','developments':'Developments','partners':'Partner with us','submit-property':'Submit a property','insights':'Insights','buying-guide':'Buying guide & FAQs','contact':'Contact','privacy':'Privacy notice','terms':'Terms of use','admin':'Administration'};const label=titles[path.split('/')[1]]||'Beta Property';document.getElementById('under-section').textContent=label.toUpperCase();document.title=`${label} — Under Development | Beta Property`;document.querySelectorAll('[aria-current]').forEach(el=>el.removeAttribute('aria-current'));}
const menuButton=document.querySelector('.menu-toggle');const mobileNav=document.getElementById('mobile-nav');
const header=document.getElementById('header');
function syncHeaderGlass(){header.classList.toggle('is-scrolled',window.scrollY>12);}
syncHeaderGlass();
window.addEventListener('scroll',syncHeaderGlass,{passive:true});
function closeMenu(){mobileNav.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open menu');document.body.classList.remove('menu-open');}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';mobileNav.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close menu':'Open menu');document.body.classList.toggle('menu-open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();menuButton.focus();}if(e.key==='Tab'&&!mobileNav.hidden){const focusable=[menuButton,...mobileNav.querySelectorAll('a')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
window.addEventListener('resize',()=>{if(window.innerWidth>800)closeMenu();});
document.getElementById('year').textContent=new Date().getFullYear();
document.getElementById('back-top').addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.body.classList.add('motion-ready');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
const cities={lagos:{name:'Lagos.',description:'Big city energy. Your next possibility.',image:'/assets/building.webp'},abuja:{name:'Abuja.',description:'A fresh perspective. Space for your future.',image:'/assets/apartment.webp'}};
function selectCity(city){const data=cities[city];document.querySelectorAll('[data-city]').forEach(button=>{const selected=button.dataset.city===city;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});document.getElementById('city-name').textContent=data.name;document.getElementById('city-description').textContent=data.description;document.getElementById('city-coordinate').textContent=city.toUpperCase();document.getElementById('city-image').src=data.image;document.getElementById('city-panel').setAttribute('aria-labelledby',`${city}-tab`);const link=document.getElementById('city-link');link.href=`/properties?location=${city}`;link.innerHTML=`Explore ${data.name.slice(0,-1)} properties <span class="arrow-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg></span>`;}
document.querySelectorAll('[data-city]').forEach(button=>{button.addEventListener('click',()=>selectCity(button.dataset.city));button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'lagos':event.key==='End'?'abuja':button.dataset.city==='lagos'?'abuja':'lagos';selectCity(next);document.getElementById(next+'-tab').focus();}});});
// Gentle hero photography rotation; never represents these images as available listings.
if(isHome&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const heroImage=document.querySelector('.hero-photo img');const slides=[{src:'/assets/exterior.webp',alt:'Contemporary home with landscaped outdoor space — illustrative architecture'},{src:'/assets/apartment.webp',alt:'Contemporary residential architecture — illustrative photograph'},{src:'/assets/hero.webp',alt:'Modern interior with natural light — illustrative photograph'}];let slideIndex=0;setInterval(()=>{if(document.hidden)return;slideIndex=(slideIndex+1)%slides.length;const next=new Image();next.onload=()=>{heroImage.style.opacity='.35';setTimeout(()=>{heroImage.src=next.src;heroImage.alt=slides[slideIndex].alt;heroImage.style.opacity='1';document.querySelectorAll('.hero-pagination>span').forEach((dot,index)=>dot.classList.toggle('active',index===slideIndex));document.querySelector('.hero-pagination b').textContent=`0${slideIndex+1} / 03`;},300);};next.src=slides[slideIndex].src;},9000);}
