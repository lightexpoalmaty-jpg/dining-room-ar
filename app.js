import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#view'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xede9e2);renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.05,100);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxDistance=12;controls.minDistance=2;controls.maxPolarAngle=Math.PI*.49;
function reset(){camera.position.set(-4,3.2,5);controls.target.set(0,.8,-.3);controls.update()}
reset();scene.add(new THREE.HemisphereLight(0xffffff,0x797064,2.5));const sun=new THREE.DirectionalLight(0xfff3dd,3);sun.position.set(-3,6,4);scene.add(sun);
let chairs=[],upholstery=[],room=null;
const palette=[['Коричневый','#786354'],['Бирюзовый','#287d83'],['Светлый','#d7c8ae'],['Графит','#41454b'],['Терракота','#b16e54']];
palette.forEach(([name,color],i)=>{let b=document.createElement('button');b.className='swatch';b.style.background=color;b.title=name;b.setAttribute('aria-label',name);b.setAttribute('aria-pressed',i===0);b.onclick=()=>{upholstery.forEach(m=>m.color.set(color));document.querySelectorAll('.swatch').forEach(x=>x.setAttribute('aria-pressed',x===b))};document.querySelector('#colors').append(b)});
function count(){const n=Number(document.querySelector('#count').value);chairs.forEach((o,i)=>o.visible=i<n)}
document.querySelector('#count').onchange=count;document.querySelector('#reset').onclick=reset;
new GLTFLoader().load('room.glb',g=>{scene.add(g.scene);g.scene.traverse(o=>{if(o.isMesh){for(const m of (Array.isArray(o.material)?o.material:[o.material])){const colors={Oak_procedural:'#9b7149',Floor_oak_procedural:'#ac865d',Warm_white_plaster:'#e9e5dd',Turquoise_jacquard:'#287d83',Taupe_upholstery:'#786354'};if(colors[m.name])m.color.set(colors[m.name]);if(m.name==='White_sheer_translucent'){m.transparent=true;m.opacity=.22;m.depthWrite=false;m.color.set('#ffffff')}if(m.name.startsWith('Taupe_upholstery')&&!upholstery.includes(m))upholstery.push(m)}}if(/^Chair_\d+_ASSEMBLY/.test(o.name))chairs.push(o);if(/^Wall_left/.test(o.name)||o.name==='Crown_side'||o.name==='Skirting_side')o.visible=false});chairs.sort((a,b)=>a.name.localeCompare(b.name));
if(chairs.length>=2){for(let i=0;i<2;i++){const c=chairs[i].clone(true);c.name='Extra_chair_'+i;c.position.x=i===0?-.72:.25;c.position.z=-1.05;c.quaternion.identity();g.scene.add(c);chairs.push(c)}}count();status.textContent='3D готово · цвет и количество меняются сразу';},undefined,e=>{status.textContent='Не удалось загрузить 3D. Проверьте интернет и обновите страницу.';console.error(e)});
function resize(){if(renderer.xr.isPresenting)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();

// WebXR uses the same live furniture materials and visibility as the 3D view.
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
let xrSession=null,hitSource=null,placed=false,hidden=[];
const reticle=new THREE.Mesh(new THREE.RingGeometry(.13,.17,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x21a993}));
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
const ar=document.querySelector('#ar'),place=document.querySelector('#place'),exit=document.querySelector('#exitAR');
document.querySelector('aside').addEventListener('beforexrselect',e=>e.preventDefault());
function restore(){hitSource?.cancel();hitSource=null;xrSession=null;reticle.visible=false;if(room){room.visible=true;room.position.set(0,0,0);room.quaternion.identity()}hidden.forEach(([o,v])=>o.visible=v);hidden=[];count();renderer.setClearColor(0xede9e2,1);controls.enabled=true;place.hidden=true;exit.hidden=true;ar.hidden=false;document.body.classList.remove('ar-active');status.textContent='3D просмотр';reset();resize()}
place.onclick=()=>{if(!room||!reticle.visible)return;room.position.setFromMatrixPosition(reticle.matrix);room.visible=true;placed=true;status.textContent='Мебель размещена. Можно менять цвет и число стульев.';place.textContent='Переставить на отмеченное место'};
exit.onclick=()=>xrSession?.end();
ar.onclick=async()=>{if(!room){status.textContent='Дождитесь загрузки модели';return}try{
 const session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],domOverlay:{root:document.body}});xrSession=session;session.addEventListener('end',restore,{once:true});
 await renderer.xr.setSession(session);const viewer=await session.requestReferenceSpace('viewer');hitSource=await session.requestHitTestSource({space:viewer});
 hidden=[];room.traverse(o=>{if(/^(Floor_|Wall_|Rear_|Skirting_|Crown_|Relief_|Window_|Radiator_|Heating_|Sheer_|Turquoise_|Curtain_|Bench_)/.test(o.name)){hidden.push([o,o.visible]);o.visible=false}});
 room.visible=false;placed=false;renderer.setClearColor(0x000000,0);controls.enabled=false;ar.hidden=true;exit.hidden=false;place.hidden=false;place.textContent='Поставить мебель';document.body.classList.add('ar-active');status.textContent='Направьте камеру на свободный пол. Найдите зелёное кольцо и нажмите «Поставить мебель».';
 }catch(e){if(xrSession)await xrSession.end();status.textContent='AR не запустился. Нужен совместимый Android, Chrome и разрешение камеры. 3D просмотр доступен.';console.error(e)}};
if(navigator.xr){navigator.xr.isSessionSupported('immersive-ar').then(ok=>{ar.disabled=!ok;ar.textContent=ok?'Посмотреть у себя · камера':'AR недоступен на этом устройстве'}).catch(()=>{ar.disabled=true;ar.textContent='AR недоступен'})}else{ar.disabled=true;ar.textContent='Камера AR: откройте на Android'}
renderer.setAnimationLoop((time,frame)=>{if(!room)room=scene.children.find(o=>o.type==='Group'&&o.children.some(c=>c.name.startsWith('Chair_')))||null;
 if(frame&&hitSource){const hits=frame.getHitTestResults(hitSource);reticle.visible=hits.length>0;if(hits.length){const pose=hits[0].getPose(renderer.xr.getReferenceSpace());if(pose)reticle.matrix.fromArray(pose.transform.matrix)}place.disabled=!reticle.visible}
 if(!renderer.xr.isPresenting)controls.update();renderer.render(scene,camera)});

