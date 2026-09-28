import { expect, test, type Page } from '@playwright/test';
import { ADMIN, approveListing, buy, createListing, opsLogin, pay, person, pngFile, shot, signup, submitListing, uid } from './helpers';

test.describe.configure({ mode: 'serial' });

let seller: Page, buyer: Page, ops: Page;
let listingId = '', listing2 = '', dealId = '', deal2 = '';
const run = uid();
const handle = `home_cook_${run}`;
let P = '';

test.beforeAll(async ({ browser }, info) => {
  P = info.project.name;
  seller = await person(browser, info.project);
  buyer = await person(browser, info.project);
  ops = await person(browser, info.project);
});

test.afterAll(async () => {
  for (const p of [seller, buyer, ops]) expect((p as any).__errors, 'uncaught page errors').toEqual([]);
});

test('1. signup + RTL shell', async () => {
  await signup(seller, `سارة ${run}`, `seller-${run}@example.test`);
  await expect(seller).toHaveURL(/\/$/);
  await expect(seller.locator('html')).toHaveAttribute('dir', 'rtl');
  await signup(buyer, 'خالد المشتري', `buyer-${run}@example.test`);
  await opsLogin(ops);
  // Validation errors are shown inline in Arabic.
  const anon = buyer.context();
  const p = await anon.newPage();
  await p.goto('/signup');
  await p.getByRole('button', { name: 'إنشاء الحساب' }).click();
  await expect(p.getByText('الاسم قصير جدًا')).toBeVisible();
  await shot(p, `${P}-signup-validation`);
  await p.close();
});

test('2. seller creates listing with ownership proof and submits', async () => {
  listingId = await createListing(seller, { handle, title: 'حساب طبخ منزلي بجمهور خليجي متفاعل', followers: '48200', price: '2500' });
  await shot(seller, `${P}-sell-wizard`, true);
  // Required evidence gate is explained before submit.
  await submitListing(seller);
  await shot(seller, `${P}-sell-submitted`);
  // Not public yet.
  await buyer.goto(`/listings/${listingId}`);
  await expect(buyer.getByRole('heading', { name: 'غير موجود' })).toBeVisible();
});

test('3. ops reviews: evidence locked until claimed; mismatch blocks approval; then approve', async () => {
  await ops.goto('/admin/reviews');
  await expect(ops.getByText(`@${handle}`)).toBeVisible();
  await shot(ops, `${P}-admin-review-queue`);
  await ops.goto(`/admin/reviews/${listingId}`);
  await expect(ops.getByText('الأدلة مقفلة')).toBeVisible();
  await ops.getByRole('button', { name: 'حجز للمراجعة' }).click();
  await expect(ops.locator('.evidence-grid img').first()).toBeVisible();
  await expect(ops.getByText('الفحوص الآلية قيد التنفيذ')).toHaveCount(0, { timeout: 30000 });
  // Claimed stats vs screenshot mismatch → refused and fraud case opened.
  await ops.getByLabel(/عدد المتابعين كما يظهر/).fill('20000');
  await ops.getByRole('checkbox', { name: /تحققت بنفسي/ }).check();
  await ops.getByRole('checkbox', { name: /لقطة الإعدادات تُظهر/ }).check();
  await ops.getByLabel('ملاحظة للبائع (تظهر له)').fill('مراجعة أولية للأرقام.');
  await ops.getByRole('button', { name: 'اعتماد ونشر' }).click();
  await expect(ops.getByText(/لا يمكن الاعتماد/).first()).toBeVisible();
  await shot(ops, `${P}-admin-review-mismatch`, true);
  // Resolve the fraud case (reviewer re-checked: typo), then approve with the right number.
  await ops.goto('/admin/fraud');
  await ops.locator('.card', { hasText: 'عدم تطابق عدد المتابعين' }).first().getByRole('button', { name: 'معالجة' }).click();
  await ops.getByLabel('المسوغات (تُحفظ في التدقيق)').fill('خطأ إدخال من المراجع، الرقم الصحيح مطابق');
  await ops.getByRole('button', { name: 'حفظ القرار' }).click();
  await expect(ops.getByText('أُغلقت الحالة')).toBeVisible();
  await ops.goto(`/admin/reviews/${listingId}`);
  await ops.getByLabel(/عدد المتابعين كما يظهر/).fill('48000');
  await ops.getByRole('checkbox', { name: /تحققت بنفسي/ }).check();
  await ops.getByRole('checkbox', { name: /لقطة الإعدادات تُظهر/ }).check();
  await ops.getByLabel('ملاحظة للبائع (تظهر له)').fill('تم التحقق من الرمز واللقطات.');
  await ops.getByRole('button', { name: 'اعتماد ونشر' }).click();
  await expect(ops.getByText('تم تسجيل القرار')).toBeVisible();
  await seller.goto(`/sell/${listingId}`);
  await expect(seller.getByText('إعلانك منشور')).toBeVisible();
});

test('4. ops edits settings with no deploy (reclaim hold → 0 for this run)', async () => {
  await ops.goto('/admin/settings');
  await ops.getByLabel('فترة حماية الاسترداد').fill('0');
  await ops.getByLabel('سقف الاعتماد التلقائي اليومي (للمنصة)').fill('100000');
  // Local Algerian payments: the platform's CCP RIP must be set before BaridiMob is offered.
  await ops.getByLabel('RIP حساب المنصة').fill('00799999000123456789');
  await ops.getByLabel('اسم صاحب الحساب', { exact: true }).fill('TrustTransfer SARL');
  await ops.getByRole('button', { name: 'حفظ الإعدادات' }).click();
  await expect(ops.getByText('حُفظت الإعدادات')).toBeVisible();
  await shot(ops, `${P}-admin-settings`, true);
});

test('5. buyer discovers, chats (contact sharing blocked), buys with a declined card then pays', async () => {
  await buyer.goto('/listings');
  await buyer.getByRole('button', { name: 'التصفية' }).click();
  await buyer.getByLabel('المجال').selectOption('food');
  await buyer.getByLabel('متابعون من').fill('40000');
  await buyer.getByRole('button', { name: 'عرض النتائج' }).click();
  await expect(buyer.getByText(`@${handle}`)).toBeVisible();
  await shot(buyer, `${P}-browse`, true);
  await buyer.getByText(`@${handle}`).click();
  await shot(buyer, `${P}-listing-detail`, true);
  await buyer.getByRole('button', { name: 'اسأل البائع' }).click();
  await expect(buyer).toHaveURL(/\/messages\//);
  const box = buyer.getByLabel('نص الرسالة');
  await box.fill('السلام عليكم، كم نسبة الجمهور من السعودية؟');
  await box.press('Enter');
  await expect(buyer.locator('.msg.mine').first()).toBeVisible();
  await box.fill('كلمني واتساب ٠٥٥٥١٢٣٤٥٦');
  await expect(buyer.getByText(/ستُحجب وتُسجَّل/)).toBeVisible();
  await box.press('Enter');
  await expect(buyer.getByText(/حُجبت الرسالة/)).toBeVisible();
  await shot(buyer, `${P}-chat-blocked`);
  // Seller sees the legit message only.
  await seller.goto('/messages');
  await seller.getByText('خالد المشتري').first().click();
  await expect(seller.locator('.chat-log').getByText('كم نسبة الجمهور')).toBeVisible();
  await expect(seller.getByText('واتساب')).toHaveCount(0);
  await seller.getByLabel('نص الرسالة').fill('وعليكم السلام، حوالي 70٪ من السعودية حسب الإحصاءات.');
  await seller.getByLabel('نص الرسالة').press('Enter');

  dealId = await buy(buyer, listingId);
  await shot(buyer, `${P}-sandbox-checkout`);
  await buyer.getByRole('button', { name: 'محاكاة رفض البطاقة' }).click();
  await expect(buyer.getByText(/رُفضت البطاقة/)).toBeVisible();
  await pay(buyer);
  await shot(buyer, `${P}-deal-held`, true);
  // Listing is reserved: cannot be bought by someone else.
  await buyer.goto(`/listings/${listingId}`);
  await expect(buyer.getByText(/محجوز لصفقة/).first()).toBeVisible();
});

test('6. guided transfer with one-time secrets, ops verification, buyer confirmation, release', async () => {
  const S = `/deals/${dealId}`;
  await seller.goto(S);
  await seller.getByRole('button', { name: 'أكّدت التنفيذ' }).click();
  await expect(seller.getByText('تم تسجيل تنفيذ الخطوة')).toBeVisible();

  // Step 2: buyer sends recovery email via secure channel, seller reveals once, performs, buyer confirms.
  await buyer.goto(S);
  await buyer.getByLabel('البريد الإلكتروني الجديد للاسترداد').fill('owner-new@example.test');
  await buyer.getByRole('button', { name: 'إرسال آمن للبائع' }).click();
  await expect(buyer.getByText(/أُرسلت البيانات مشفّرة/)).toBeVisible();
  await seller.reload();
  await seller.getByRole('button', { name: 'كشف لمرة واحدة' }).click();
  await expect(seller.locator('.secret-value')).toHaveText('owner-new@example.test');
  await shot(seller, `${P}-secret-revealed`);
  await seller.getByRole('button', { name: 'أخفِ وتابع' }).click();
  await seller.getByRole('button', { name: 'أكّدت التنفيذ' }).click();
  await expect(seller.getByText('تم تسجيل تنفيذ الخطوة')).toBeVisible();
  await buyer.reload();
  await buyer.getByRole('button', { name: 'أؤكد' }).click();
  await expect(buyer.getByText('تم التأكيد')).toBeVisible();

  // Step 3: phone — buyer first rejects once (wrong), then confirms.
  await buyer.getByLabel('رقم الهاتف الجديد للاسترداد').fill('+966 500 000 111');
  await buyer.getByRole('button', { name: 'إرسال آمن للبائع' }).click();
  await seller.reload();
  await seller.getByRole('button', { name: 'كشف لمرة واحدة' }).click();
  await seller.getByRole('button', { name: 'أخفِ وتابع' }).click();
  await seller.getByRole('button', { name: 'أكّدت التنفيذ' }).click();
  await buyer.reload();
  await buyer.getByRole('button', { name: 'لم يتم بشكل صحيح' }).click();
  await buyer.getByLabel('ما المشكلة؟').fill('الرقم القديم ما زال مضافًا في إعدادات الأمان');
  await buyer.getByRole('button', { name: 'إعادة الخطوة للبائع' }).click();
  await seller.reload();
  await expect(seller.getByText('الرقم القديم ما زال مضافًا')).toBeVisible();
  await seller.getByRole('button', { name: 'أكّدت التنفيذ' }).click();
  await buyer.reload();
  await buyer.getByRole('button', { name: 'أؤكد' }).click();
  await expect(buyer.getByText('تم التأكيد')).toBeVisible();

  // Step 4: password via one-time reveal.
  await seller.reload();
  await seller.getByLabel('كلمة المرور المؤقتة').fill('Tmp#Handover-2026');
  await seller.getByRole('button', { name: 'أكّدت التنفيذ' }).click();
  await expect(seller.getByText('تم تسجيل تنفيذ الخطوة')).toBeVisible();
  await buyer.reload();
  await expect(buyer.getByRole('button', { name: 'أؤكد' })).toBeDisabled(); // must reveal first
  await buyer.getByRole('button', { name: 'كشف لمرة واحدة' }).click();
  await expect(buyer.locator('.secret-value')).toHaveText('Tmp#Handover-2026');
  await buyer.getByRole('button', { name: 'أخفِ وتابع' }).click();
  await buyer.getByRole('button', { name: 'أؤكد' }).click();
  await expect(buyer.getByText('تم التأكيد')).toBeVisible();
  // Step 5: buyer confirms login & control.
  await buyer.getByRole('button', { name: 'أكّدت التنفيذ' }).click();
  await expect(buyer.getByText('تم تسجيل تنفيذ الخطوة')).toBeVisible();
  await shot(buyer, `${P}-deal-steps`, true);

  // Step 6: ops verification.
  await ops.goto(`/admin/deals/${dealId}`);
  await shot(ops, `${P}-admin-deal`, true);
  await ops.getByRole('button', { name: 'اعتماد النقل' }).click();
  await expect(ops.getByText(/اعتُمد النقل/)).toBeVisible();

  await buyer.reload();
  await expect(buyer.getByText('مهلة تأكيد المشتري').first()).toBeVisible();
  await shot(buyer, `${P}-confirm-window`);
  await buyer.getByRole('button', { name: /استلمت الحساب/ }).click();
  await buyer.getByRole('button', { name: 'أؤكد وأحرر المبلغ' }).click();
  await expect(buyer.getByText('اكتملت الصفقة')).toBeVisible();
});

test('7. wallet: auto-approved small withdrawal, manual approval + payout for larger one', async () => {
  await seller.goto('/wallet');
  await expect(seller.locator('.metric', { hasText: 'المتاح للسحب' })).toContainText('2,300');
  const req = async (amount: string) => {
    await seller.getByRole('button', { name: 'طلب سحب' }).click();
    await seller.getByLabel('المبلغ ($)').fill(amount);
    await seller.getByRole('button', { name: 'حساب بنكي IBAN' }).click();
    await seller.getByLabel('اسم صاحب الحساب').fill('سارة أحمد');
    await seller.getByLabel('رقم الآيبان (IBAN)').fill('SA03 8000 0000 6080 1016 7519');
    await seller.getByLabel('اسم البنك').fill('بنك الاختبار');
    await seller.getByLabel('كلمة مرور حسابك (للتأكيد)').fill('Str0ngPassw0rd!');
    await seller.getByRole('button', { name: 'إرسال الطلب' }).click();
  };
  await req('100');
  await expect(seller.getByText(/تمت الموافقة تلقائيًا/)).toBeVisible();
  await req('1000');
  await expect(seller.getByText(/أُرسل الطلب للمراجعة المالية/)).toBeVisible();
  // Over-withdrawal is refused.
  await req('5000');
  await expect(seller.getByText('الرصيد المتاح لا يكفي.')).toBeVisible();
  await seller.getByRole('button', { name: 'إلغاء' }).click();
  await shot(seller, `${P}-wallet`, true);

  await ops.goto('/admin/withdrawals');
  await ops.locator('tr', { hasText: `سارة ${run}` }).filter({ hasText: '1,000' }).getByRole('button', { name: 'اعتماد' }).click();
  await ops.getByRole('button', { name: 'تأكيد' }).click();
  await expect(ops.getByText('تم تحديث الطلب')).toBeVisible();
  await ops.goto('/admin/withdrawals?status=approved');
  await ops.locator('tr', { hasText: `سارة ${run}` }).filter({ hasText: '1,000' }).getByRole('button', { name: 'تسجيل التحويل' }).click();
  await ops.getByRole('button', { name: /عرض بيانات التحويل/ }).click();
  await expect(ops.getByText('SA0380000000608010167519')).toBeVisible();
  await ops.getByLabel('مرجع التحويل البنكي').fill(`TRX-${run}`);
  await ops.getByRole('button', { name: 'تأكيد' }).click();
  await expect(ops.getByText('تم تحديث الطلب')).toBeVisible();
  await seller.reload();
  await expect(seller.getByText(`TRX-${run}`)).toBeVisible();
});

test('8. dispute: freeze, statements + evidence, arbiter refunds', async () => {
  listing2 = await createListing(seller, { handle: `travel_${run}`, title: 'حساب سفر وسياحة بجمهور عربي', followers: '15300', price: '600' });
  await submitListing(seller);
  await approveListing(ops, listing2, '15300');
  deal2 = await buy(buyer, listing2);
  await pay(buyer);
  await seller.goto(`/deals/${deal2}`);
  await seller.getByRole('button', { name: 'أكّدت التنفيذ' }).click();
  await buyer.goto(`/deals/${deal2}`);
  await buyer.getByRole('button', { name: 'فتح نزاع' }).click();
  await buyer.getByLabel('السبب').selectOption('transfer_stalled');
  await buyer.getByLabel('اشرح ما حدث').fill('البائع أكد تجهيز الحساب لكنه لم يستجب منذ يومين ولم يكشف البريد الجديد.');
  await buyer.getByRole('button', { name: 'فتح النزاع وتجميد الضمان' }).click();
  await expect(buyer).toHaveURL(/\/disputes\//);
  const disputeId = buyer.url().split('/').pop();
  await buyer.locator('input[type=file]').setInputFiles((await import('./helpers')).pngFile(`dispute-${run}`));
  await buyer.getByLabel('وصف الدليل').fill('لقطة للمحادثة المتوقفة');
  await buyer.getByRole('button', { name: 'رفع مشفّر' }).click();
  await expect(buyer.getByText('تم رفع الدليل وتشفيره')).toBeVisible();
  await shot(buyer, `${P}-dispute-party`, true);
  // Escrow is frozen for the seller.
  await seller.goto(`/deals/${deal2}`);
  await expect(seller.getByText('نزاع مفتوح — الضمان مجمّد')).toBeVisible();
  await seller.goto(`/disputes/${disputeId}`);
  await seller.getByLabel('إفادتك').fill('كنت مسافرًا بلا اتصال، وأعتذر عن التأخير.');
  await seller.getByRole('button', { name: 'إرسال الإفادة' }).click();

  await ops.goto('/admin/disputes');
  await ops.locator('tr', { hasText: 'حساب سفر' }).click();
  await ops.getByRole('button', { name: 'تولّي النزاع' }).click();
  await expect(ops.getByText('إصدار القرار')).toBeVisible();
  await ops.getByRole('tab', { name: /المحادثة/ }).click();
  await ops.getByRole('tab', { name: 'سجل النقل' }).click();
  await ops.getByRole('tab', { name: 'تحقق الإعلان' }).click();
  await expect(ops.locator('.evidence-grid img').first()).toBeVisible();
  await ops.getByRole('tab', { name: 'الملف والأدلة' }).click();
  await shot(ops, `${P}-admin-dispute`, true);
  await ops.getByRole('radio', { name: 'رد كامل المبلغ للمشتري' }).check();
  await ops.getByLabel('مسوغات القرار (تظهر للطرفين)').fill('ثبت توقف البائع عن إكمال النقل دون مبرر كافٍ؛ يُرد المبلغ كاملًا.');
  await ops.getByRole('button', { name: 'تنفيذ القرار' }).click();
  await expect(ops.getByText('صدر القرار ونُفّذ على الضمان')).toBeVisible();
  await buyer.goto(`/deals/${deal2}`);
  await expect(buyer.getByText('تم رد المبلغ للمشتري').first()).toBeVisible();
});

test('9. admin: users/roles, reports, audit trail', async () => {
  await ops.goto('/admin/users');
  await ops.getByLabel('بحث').fill(`seller-${run}`);
  await ops.getByLabel('بحث').press('Enter');
  await expect(ops.locator('tbody tr')).toHaveCount(1);
  await ops.locator('tbody tr').first().click();
  await expect(ops.getByText('ثقة البائع').first()).toBeVisible();
  await shot(ops, `${P}-admin-user`, true);
  await ops.goto('/admin/reports');
  await expect(ops.getByText('صافي العمولة اليومي')).toBeVisible();
  await shot(ops, `${P}-admin-reports`, true);
  await ops.goto('/admin/audit');
  await ops.getByPlaceholder('الإجراء (مثال: escrow.)').fill('escrow.');
  await ops.getByRole('button', { name: 'تصفية' }).click();
  await expect(ops.getByText('escrow.released').first()).toBeVisible();
  await shot(ops, `${P}-admin-audit`);
  await ops.goto('/admin');
  await shot(ops, `${P}-admin-overview`, true);
  // Restore default reclaim hold for subsequent runs.
  await ops.goto('/admin/settings');
  await ops.getByLabel('فترة حماية الاسترداد').fill('7');
  await ops.getByLabel('سقف الاعتماد التلقائي اليومي (للمنصة)').fill('1000');
  await ops.getByRole('button', { name: 'حفظ الإعدادات' }).click();
  await expect(ops.getByText('حُفظت الإعدادات')).toBeVisible();
  // Public profile reflects trust from real history.
  await buyer.goto('/deals');
  await shot(buyer, `${P}-deals-list`);
  void ADMIN;
});

test('10. Algeria: Edahabia via Chargily, BaridiMob transfer with receipt + finance verification', async ({ browser }, info) => {
  // Fresh seller: the first one lost a dispute in step 8, which (by design) opens a fraud case on new listings.
  const seller2 = await person(browser, info.project);
  await signup(seller2, `ياسين ${run}`, `seller2-${run}@example.test`);
  await expect(seller2).toHaveURL(/\/$/);
  const l3 = await createListing(seller2, { handle: `dz_food_${run}`, title: 'حساب طبخ جزائري بجمهور محلي', followers: '9100', price: '300' });
  await submitListing(seller2);
  await approveListing(ops, l3, '9100');
  // Edahabia: amount shown in DZD at the admin rate, paid through the signed Chargily sandbox.
  await buyer.goto(`/listings/${l3}`);
  await buyer.getByRole('button', { name: 'اشترِ عبر الضمان' }).click();
  const dlg = buyer.getByRole('dialog');
  await dlg.getByRole('radio', { name: /البطاقة الذهبية/ }).check();
  await expect(dlg.getByText(/دج/).first()).toBeVisible();
  await dlg.getByRole('checkbox').check();
  await shot(buyer, `${P}-buy-methods`);
  await buyer.getByRole('button', { name: 'المتابعة للدفع' }).click();
  await expect(buyer).toHaveURL(/checkout\/sandbox\/.*provider=chargily/);
  await expect(buyer.getByText(/Chargily Pay/)).toBeVisible();
  await shot(buyer, `${P}-chargily-sandbox`);
  await pay(buyer);

  const l4 = await createListing(seller2, { handle: `dz_sport_${run}`, title: 'حساب رياضة جزائري', followers: '7200', price: '200' });
  await submitListing(seller2);
  await approveListing(ops, l4, '7200');
  await buyer.goto(`/listings/${l4}`);
  await buyer.getByRole('button', { name: 'اشترِ عبر الضمان' }).click();
  await buyer.getByRole('dialog').getByRole('radio', { name: /BaridiMob/ }).check();
  await buyer.getByRole('dialog').getByRole('checkbox').check();
  await buyer.getByRole('button', { name: 'المتابعة للدفع' }).click();
  await expect(buyer).toHaveURL(/\/deals\//);
  await expect(buyer.getByRole('heading', { name: /الدفع بتحويل BaridiMob/ })).toBeVisible();
  await expect(buyer.getByText('00799999000123456789').first()).toBeVisible();
  await shot(buyer, `${P}-baridimob-instructions`, true);
  await buyer.locator('.upload-zone input[type=file]').setInputFiles(pngFile(`receipt-${run}`));
  await buyer.getByLabel('رقم العملية / المرجع في الوصل').fill(`BM-${run}`);
  await buyer.getByLabel(/رقم RIP الخاص بك/).fill('00799999 0001 1122 2333');
  await buyer.getByRole('button', { name: 'إرسال الوصل للتحقق' }).click();
  await expect(buyer.getByText('وصل التحويل قيد التحقق')).toBeVisible();

  await ops.goto('/admin/local-payments');
  const card = ops.locator('.card', { hasText: `BM-${run}` });
  await expect(card).toBeVisible();
  await shot(ops, `${P}-admin-local-payments`, true);
  await card.getByRole('button', { name: 'تأكيد الاستلام' }).click();
  await ops.getByLabel(/ملاحظة/).fill('ظهر المبلغ في كشف حساب CCP');
  await ops.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
  await expect(ops.getByText('تم تسجيل القرار')).toBeVisible();
  await buyer.reload();
  await expect(buyer.getByText('المبلغ محتجز لدى الضمان').first()).toBeVisible();
});
