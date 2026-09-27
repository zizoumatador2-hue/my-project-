import { Link } from 'react-router-dom';
import { useSession } from '../lib/session';
import { int } from '../lib/format';
import { Icon } from '../ui/icons';
import { ListingCard, ListingCardSkeleton, type ListingSummary } from '../ui/ListingCard';
import { useFetch } from '../ui/kit';

export default function Home() {
  const latest = useFetch<{ items: ListingSummary[]; total: number }>('/listings?limit=6&sort=newest');
  const { config } = useSession();
  const hours = config?.escrow.confirmation_window_hours ?? 72;
  const hold = config?.escrow.reclaim_hold_days ?? 7;

  return (
    <>
      <section className="hero">
        <div className="seal-lines" aria-hidden />
        <div className="container stack" style={{ position: 'relative' }}>
          <span className="badge seal" style={{ alignSelf: 'flex-start' }}><Icon.Lock size={14} /> أموال محتجزة حتى تستلم الحساب فعليًا</span>
          <h1>انقل ملكية الحساب، لا المخاطرة.</h1>
          <p>
            سوق لبيع وشراء حسابات التواصل الاجتماعي يتحقق من ملكية كل حساب يدويًا قبل نشره، يحتجز المبلغ لدى الضمان،
            ويقود الطرفين عبر نقل موثّق خطوة بخطوة — مع فريق تحكيم يرى كل شيء عند الخلاف.
          </p>
          <div className="row">
            <Link to="/listings" className="btn btn-primary">تصفح الحسابات الموثّقة</Link>
            <Link to="/sell" className="btn btn-secondary">اعرض حسابك للبيع</Link>
          </div>
        </div>
      </section>

      <div className="container page stack" style={{ gap: 32 }}>
        <section aria-labelledby="pillars">
          <h2 id="pillars" className="visually-hidden">ضماناتنا</h2>
          <div className="pillars">
            <div className="card pillar">
              <div className="ico"><Icon.Shield /></div>
              <h3>تحقق ملكية قبل النشر</h3>
              <p className="muted small">رمز لمرة واحدة يضعه البائع على الحساب، ولقطات الإعدادات والإحصاءات، ومراجعة بشرية إلزامية لكل إعلان — مهما كانت نتيجة الفحص الآلي.</p>
            </div>
            <div className="card pillar">
              <div className="ico"><Icon.Lock /></div>
              <h3>ضمان مالي حقيقي</h3>
              <p className="muted small">يُحصَّل المبلغ ويُحتجز، ولا يصل للبائع إلا بعد اكتمال النقل وتأكيدك، أو انقضاء مهلة {int(hours)} ساعة دون اعتراض.</p>
            </div>
            <div className="card pillar">
              <div className="ico"><Icon.Key /></div>
              <h3>حماية من الاسترداد</h3>
              <p className="muted small">أشهر احتيال في هذا السوق هو استعادة البائع للحساب بعد البيع. لذلك يبقى عائد البائع معلّقًا {int(hold)} أيام بعد التحرير، ويمكنك فتح نزاع خلالها.</p>
            </div>
            <div className="card pillar">
              <div className="ico"><Icon.Scale /></div>
              <h3>تحكيم بالأدلة لا بالأقوال</h3>
              <p className="muted small">المحكّم يرى المحادثة كاملة، وسجل خطوات النقل بتوقيتاتها، وسجل التحقق من الإعلان، والأدلة المرفوعة — ثم يقرر: رد، تحرير، أو تقسيم.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="flow">
          <div className="section-title"><h2 id="flow">كيف تتحرك الصفقة</h2><Link to="/policies/escrow" className="small">التفاصيل الكاملة</Link></div>
          <ol className="flow">
            <li><strong>الدفع إلى الضمان</strong><p className="muted small" style={{ margin: 0 }}>تدفع عبر بوابة دفع آمنة، ويُحجز الإعلان لك.</p></li>
            <li><strong>نقل موجَّه</strong><p className="muted small" style={{ margin: 0 }}>ست خطوات مؤرّخة: 2FA، بريد الاسترداد، الهاتف، كلمة المرور بكشف لمرة واحدة، ودخولك.</p></li>
            <li><strong>مراجعة العمليات</strong><p className="muted small" style={{ margin: 0 }}>فريقنا يراجع السجل ويعتمد اكتمال النقل.</p></li>
            <li><strong>تأكيدك ثم التحرير</strong><p className="muted small" style={{ margin: 0 }}>تؤكد الاستلام، فيُحرَّر المبلغ للبائع تحت فترة حماية.</p></li>
          </ol>
        </section>

        <section aria-labelledby="latest">
          <div className="section-title"><h2 id="latest">أحدث الحسابات الموثّقة</h2><Link to="/listings" className="small row" style={{ gap: 4 }}>عرض الكل <Icon.ChevronForward size={16} /></Link></div>
          {latest.error ? (
            <p className="muted">تعذّر تحميل الإعلانات. <button className="btn btn-ghost btn-sm" onClick={latest.reload}>أعد المحاولة</button></p>
          ) : !latest.data ? (
            <div className="grid cols-3">{Array.from({ length: 3 }, (_, i) => <ListingCardSkeleton key={i} />)}</div>
          ) : latest.data.items.length === 0 ? (
            <div className="card flat empty"><p>لا توجد إعلانات منشورة بعد. كل إعلان يمر بمراجعة يدوية قبل ظهوره هنا.</p><Link to="/sell" className="btn btn-primary">كن أول البائعين</Link></div>
          ) : (
            <div className="grid cols-3">{latest.data.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>
          )}
        </section>

        <div className="alert warn">
          <Icon.Alert size={18} />
          <div className="body">
            <strong style={{ color: 'var(--warn)' }}>تنبيه مهم قبل الشراء أو البيع</strong>
            نقل ملكية حسابات التواصل الاجتماعي قد يخالف شروط استخدام المنصات الأصلية، وقد تتخذ تلك المنصات إجراءات مثل الإيقاف أو الاسترداد.
            TrustTransfer وسيط وضامن للمعاملة، ولا يضمن موقف تلك المنصات. <Link to="/policies/disclaimer">اقرأ إخلاء المسؤولية كاملًا</Link>.
          </div>
        </div>
      </div>
    </>
  );
}
