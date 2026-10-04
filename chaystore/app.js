const FREE_SHIP_MIN = 35, FLAT_SHIP = 5.95;
const PRODUCTS = [
  {id:"assam-chai",name:"Masala Chai Blend",cat:"Chai",emoji:"🫖",price:14.5,desc:"Bold Assam with cinnamon, cardamom, ginger and clove. 4 oz."},
  {id:"kashmiri",name:"Kashmiri Kahwa",cat:"Green",emoji:"🍃",price:16,desc:"Green tea with saffron, almonds and cardamom. 3 oz."},
  {id:"earl-grey",name:"Earl Grey Supreme",cat:"Black",emoji:"🍵",price:13,desc:"Ceylon black tea scented with real bergamot. 4 oz."},
  {id:"darjeeling",name:"First Flush Darjeeling",cat:"Black",emoji:"🌄",price:19.5,desc:"Light, floral and muscatel. 3 oz."},
  {id:"matcha",name:"Ceremonial Matcha",cat:"Green",emoji:"🟢",price:24,desc:"Stone-ground Uji-style matcha. 1 oz tin."},
  {id:"jasmine",name:"Jasmine Pearls",cat:"Green",emoji:"🌼",price:17,desc:"Hand-rolled pearls scented with jasmine blossoms. 3 oz."},
  {id:"mint",name:"Moroccan Mint",cat:"Herbal",emoji:"🌿",price:12,desc:"Gunpowder green with spearmint. 4 oz."},
  {id:"chamomile",name:"Calm Chamomile",cat:"Herbal",emoji:"🌸",price:11.5,desc:"Caffeine-free whole flower chamomile. 2 oz."},
  {id:"teapot",name:"Cast-Iron Teapot",cat:"Gear",emoji:"🫖",price:48,desc:"20 oz teapot with stainless infuser."},
  {id:"infuser",name:"Glass Travel Infuser",cat:"Gear",emoji:"🥤",price:22,desc:"16 oz borosilicate tumbler with strainer."}
];
const $ = s => document.querySelector(s);
const money = n => "$" + n.toFixed(2);
let cart = {}, cat = "All";
try { cart = JSON.parse(localStorage.getItem("chay-cart") || "{}"); } catch(e) {}
const save = () => { try { localStorage.setItem("chay-cart", JSON.stringify(cart)); } catch(e) {} };

function renderFilters(){
  const cats = ["All", ...new Set(PRODUCTS.map(p => p.cat))];
  $("#filters").innerHTML = cats.map(c => `<button class="${c===cat?"active":""}" data-c="${c}">${c}</button>`).join("");
}
function renderGrid(){
  $("#grid").innerHTML = PRODUCTS.filter(p => cat==="All"||p.cat===cat).map(p => `
    <article class="card"><div class="img">${p.emoji}</div><div class="body">
      <span class="tag">${p.cat}</span><h3>${p.name}</h3><p>${p.desc}</p>
      <div class="foot"><span class="price">${money(p.price)}</span><button data-add="${p.id}">Add to cart</button></div>
    </div></article>`).join("");
}
function totals(){
  const sub = Object.entries(cart).reduce((s,[id,q]) => s + PRODUCTS.find(p=>p.id===id).price*q, 0);
  const ship = sub===0 ? 0 : sub>=FREE_SHIP_MIN ? 0 : FLAT_SHIP;
  return {sub, ship, total: sub+ship};
}
function renderCart(){
  const ids = Object.keys(cart);
  $("#cartCount").textContent = Object.values(cart).reduce((a,b)=>a+b,0);
  $("#cartItems").innerHTML = ids.length ? ids.map(id => {
    const p = PRODUCTS.find(x=>x.id===id), q = cart[id];
    return `<div class="item"><span class="e">${p.emoji}</span><div><b>${p.name}</b><div class="qty">
      <button data-dec="${id}" aria-label="Decrease">−</button>${q}<button data-inc="${id}" aria-label="Increase">+</button></div></div>
      <b>${money(p.price*q)}</b></div>`;
  }).join("") : '<p class="muted">Your cart is empty.</p>';
  const t = totals();
  $("#subtotal").textContent = money(t.sub);
  $("#shipping-cost").textContent = t.sub===0 ? "—" : t.ship===0 ? "FREE" : money(t.ship);
  $("#total").textContent = money(t.total);
  $("#freeShipNote").textContent = t.sub>0 && t.sub<FREE_SHIP_MIN ? `Add ${money(FREE_SHIP_MIN-t.sub)} more for free US shipping.` : "";
  save();
}
function toggle(open){
  $("#drawer").classList.toggle("open", open);
  $("#overlay").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", String(!open));
}
document.addEventListener("click", e => {
  const t = e.target;
  if (t.dataset.c) { cat = t.dataset.c; renderFilters(); renderGrid(); }
  if (t.dataset.add) { cart[t.dataset.add] = (cart[t.dataset.add]||0)+1; renderCart(); toggle(true); }
  if (t.dataset.inc) { cart[t.dataset.inc]++; renderCart(); }
  if (t.dataset.dec) { if(--cart[t.dataset.dec] <= 0) delete cart[t.dataset.dec]; renderCart(); }
});
$("#cartBtn").onclick = () => toggle(true);
$("#closeCart").onclick = $("#overlay").onclick = () => toggle(false);
document.addEventListener("keydown", e => { if (e.key==="Escape") toggle(false); });
// TODO: connect to a real payment provider (Stripe Checkout / Shopify) before launch.
$("#checkoutBtn").onclick = () => alert("Checkout is not connected yet. Connect Stripe or Shopify to accept payments.");
$("#newsForm").onsubmit = e => { e.preventDefault(); $("#newsMsg").textContent = "Thanks! Check your inbox for your 10% code."; e.target.reset(); };
$("#contactForm").onsubmit = e => { e.preventDefault(); $("#contactMsg").textContent = "Thanks — we'll reply within one business day."; e.target.reset(); };
$("#year").textContent = new Date().getFullYear();
renderFilters(); renderGrid(); renderCart();
