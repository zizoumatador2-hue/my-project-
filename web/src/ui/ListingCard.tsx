import { Link } from 'react-router-dom';
import { CATEGORY_LABELS, COUNTRIES, PLATFORM_LABELS, type Category, type Platform } from '../../../shared/domain';
import { accountAge, compact, money, pct } from '../lib/format';
import { PlatformBadge, Icon } from './icons';
import { TrustSeal } from './kit';

export interface ListingSummary {
  id: string; platform: Platform; handle: string; title: string; followers: number; engagement_rate: number; category: Category;
  country: string; language: string; account_created_year: number; account_created_month: number; price_cents: number;
  seller_name?: string; seller_trust?: number; seller_completed?: number; status?: string;
}

export function ListingCard({ l }: { l: ListingSummary }) {
  return (
    <Link to={`/listings/${l.id}`} className="card listing-card">
      <div className="head">
        <PlatformBadge platform={l.platform} />
        <div className="grow">
          <div className="handle"><span className="ltr">@{l.handle}</span></div>
          <div className="xs muted">{PLATFORM_LABELS[l.platform]} · {CATEGORY_LABELS[l.category]} · {COUNTRIES[l.country] ?? l.country}</div>
        </div>
        <span className="badge vault" title="تم التحقق من الملكية يدويًا"><Icon.Shield size={14} />موثّق</span>
      </div>
      <h3>{l.title}</h3>
      <div className="stats">
        <div className="stat"><div className="v num">{compact(l.followers)}</div><div className="k">متابع</div></div>
        <div className="stat"><div className="v num">{pct(l.engagement_rate)}</div><div className="k">تفاعل</div></div>
        <div className="stat"><div className="v">{accountAge(l.account_created_year, l.account_created_month)}</div><div className="k">عمر الحساب</div></div>
      </div>
      <div className="row between">
        <div className="price num">{money(l.price_cents)}</div>
        {l.seller_trust !== undefined && (
          <div className="row" style={{ gap: 8 }}>
            <span className="xs muted" style={{ textAlign: 'end' }}>{l.seller_name}<br />{l.seller_completed ?? 0} صفقة مكتملة</span>
            <TrustSeal score={l.seller_trust} size="sm" label="ثقة البائع" />
          </div>
        )}
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="card listing-card" aria-hidden>
      <div className="head"><div className="skeleton" style={{ inlineSize: 40, blockSize: 40 }} /><div className="grow stack-sm"><div className="skeleton" style={{ blockSize: 14, inlineSize: '50%' }} /><div className="skeleton" style={{ blockSize: 10, inlineSize: '70%' }} /></div></div>
      <div className="skeleton" style={{ blockSize: 44 }} />
      <div className="skeleton" style={{ blockSize: 52 }} />
      <div className="skeleton" style={{ blockSize: 28, inlineSize: '40%' }} />
    </div>
  );
}
