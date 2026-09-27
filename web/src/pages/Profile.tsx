import { useParams } from 'react-router-dom';
import { date, int } from '../lib/format';
import { ListingCard } from '../ui/ListingCard';
import { Alert, Loadable, TrustSeal, useFetch } from '../ui/kit';

export default function Profile() {
  const { id } = useParams();
  const state = useFetch<any>(`/users/${id}`);
  return (
    <div className="container page">
      <Loadable state={state}>
        {({ user: u, listings }) => (
          <div className="stack">
            <div className="card pad-lg stack">
              <div className="row" style={{ gap: 16 }}>
                <div className="grow"><h1 style={{ fontSize: '1.5rem', margin: 0 }}>{u.display_name}</h1><div className="small muted">عضو منذ {date(u.member_since)}</div></div>
              </div>
              {u.suspended && <Alert kind="danger">هذا الحساب موقوف حاليًا.</Alert>}
              <div className="grid cols-2">
                <div className="panel row" style={{ gap: 14 }}>
                  <TrustSeal score={u.trust_seller} label="ثقة البائع" />
                  <div><strong>ثقة كبائع</strong><div className="small muted">{int(u.seller_stats.completed)} صفقة بيع مكتملة · {int(u.seller_stats.disputes_lost)} نزاع خاسر</div></div>
                </div>
                <div className="panel row" style={{ gap: 14 }}>
                  <TrustSeal score={u.trust_buyer} label="ثقة المشتري" />
                  <div><strong>ثقة كمشترٍ</strong><div className="small muted">{int(u.buyer_stats.completed)} صفقة شراء مكتملة</div></div>
                </div>
              </div>
              {u.avg_response_minutes !== null && <div className="small muted">متوسط زمن الرد: {u.avg_response_minutes < 60 ? `${int(u.avg_response_minutes)} دقيقة` : `${int(Math.round(u.avg_response_minutes / 60))} ساعة`}</div>}
              <p className="xs muted" style={{ margin: 0 }}>يُحسب المؤشر من معاملات فعلية فقط: الصفقات المكتملة، والنزاعات ونتائجها، والإلغاءات، ونتائج التحقق، وسرعة الرد، ومخالفات المحادثة. لا يمكن شراء التقييم أو تعديله يدويًا.</p>
            </div>
            <h2>إعلانات البائع</h2>
            {listings.length === 0 ? <p className="muted">لا إعلانات منشورة.</p> : <div className="grid cols-3">{listings.map((l: any) => <ListingCard key={l.id} l={l} />)}</div>}
          </div>
        )}
      </Loadable>
    </div>
  );
}
