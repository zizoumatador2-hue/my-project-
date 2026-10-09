export interface HubTopic {
  title: string;
  blurb: string;
  href: string;
}
export interface Hub {
  slug: string;
  label: string;
  title: string;
  heading: string;
  description: string;
  image: { slug: string; alt: string };
  intro: string[];
  topics: HubTopic[];
  watch: string[];
  faq: { question: string; answer: string }[];
  sources: { name: string; url: string }[];
}

export const hubs: Record<string, Hub> = {
  'economic-indicators': {
    slug: 'economic-indicators',
    label: 'Economic Indicators',
    title: 'U.S. Economic Indicators That Move Markets',
    heading: 'U.S. Economic Indicators',
    description:
      'How CPI, PCE, the jobs report, GDP, retail sales, PMIs, and consumer sentiment move U.S. stocks, bonds, and the dollar, and what to watch in each release.',
    image: { slug: 'grocery-prices', alt: 'Shopper placing fresh vegetables and bread into a paper grocery bag in a supermarket' },
    intro: [
      'Economic indicators are the scheduled data releases that tell investors how fast the U.S. economy is growing, how quickly prices are rising, and how many people are working. They matter to markets for one main reason: they change expectations about what the Federal Reserve will do with interest rates, and interest rates affect the value of almost every financial asset.',
      'Most of the reports that move markets come from three federal agencies. The Bureau of Labor Statistics publishes inflation and employment data, the Bureau of Economic Analysis publishes GDP and the PCE price index, and the Census Bureau publishes retail sales and housing data. Many of these come out at 8:30 a.m. Eastern Time, an hour before the stock market opens, which is why stock futures often jump right before the bell.',
      'The number itself is only half the story. Markets react to the difference between the actual figure and the consensus forecast, and to the details underneath the headline. A report can beat expectations and still push stocks lower if it raises the odds of higher interest rates.',
    ],
    topics: [
      { title: 'Inflation: CPI, PCE, and PPI', blurb: 'Headline vs. core inflation, why the Fed prefers PCE, and how a hot reading moves yields and growth stocks.', href: '/#inflation-cpi-pce-and-ppi' },
      { title: 'The jobs report and weekly claims', blurb: 'Nonfarm payrolls, the unemployment rate, revisions, and why strong hiring is not always good news for stocks.', href: '/#employment-the-jobs-report-and-weekly-claims' },
      { title: 'GDP and its components', blurb: 'Advance, second, and third estimates, and the parts of GDP that say the most about where growth is headed.', href: '/#growth-gdp-and-its-components' },
      { title: 'Consumer spending and sentiment', blurb: 'Retail sales, the control group, and why sentiment surveys and actual spending sometimes disagree.', href: '/#consumer-spending-and-sentiment' },
      { title: 'PMIs and manufacturing data', blurb: 'Why the 50 line matters and which ISM sub-indexes act as early warnings.', href: '/#business-activity-pmis-and-manufacturing-data' },
      { title: 'Treasury yields and the yield curve', blurb: 'The 2-year vs. the 10-year, curve inversions, and what they have and have not predicted.', href: '/#treasury-yields-and-the-yield-curve' },
    ],
    watch: [
      'The month-over-month change in core inflation, not just the year-over-year rate',
      'Revisions to the prior two months of payroll data',
      'Services prices excluding housing, a measure the Fed has watched closely',
      'How the 2-year Treasury yield reacts in the first hour after a release',
    ],
    faq: [
      { question: 'Which economic report moves the stock market the most?', answer: 'It depends on what investors are worried about. When inflation is the main concern, the Consumer Price Index tends to produce the biggest reactions. When recession is the worry, the monthly jobs report often matters more.' },
      { question: 'What is the difference between CPI and PCE?', answer: 'Both measure consumer prices. CPI comes from the Bureau of Labor Statistics and is released earlier in the month. PCE comes from the Bureau of Economic Analysis, covers a broader set of spending, and is the measure the Federal Reserve uses for its 2% inflation target.' },
      { question: 'Why do markets react before the data is even released?', answer: 'Investors position ahead of major releases based on forecasts. When the actual number arrives, prices adjust to the size of the surprise relative to those forecasts.' },
    ],
    sources: [
      { name: 'Bureau of Labor Statistics release calendar', url: 'https://www.bls.gov/schedule/news_release/' },
      { name: 'Bureau of Economic Analysis release schedule', url: 'https://www.bea.gov/news/schedule' },
      { name: 'Census Bureau economic indicators calendar', url: 'https://www.census.gov/economic-indicators/calendar-listview.html' },
    ],
  },

  'stock-market-triggers': {
    slug: 'stock-market-triggers',
    label: 'Stock Market Triggers',
    title: 'Stock Market Triggers: Earnings, Guidance and Corporate News',
    heading: 'Stock Market Triggers',
    description:
      'How earnings reports, guidance, analyst ratings, buybacks, dividends, IPOs, mergers, and SEC filings move individual stocks and sometimes the whole market.',
    image: { slug: 'boardroom-earnings', alt: 'Executive team reviewing printed bar charts around a conference table high above a city' },
    intro: [
      'Economic data moves the whole market at once. Company news decides which stocks lead and which fall behind. For most individual stocks, the largest single-day moves of the year come around quarterly earnings, when a company reports results and, often more importantly, updates its outlook.',
      'Corporate triggers work mainly through earnings expectations. A raised forecast lifts estimates of future profits, and the stock price adjusts. A lowered forecast does the opposite, even if the quarter just reported looked fine. That is why guidance is so often the real story behind an earnings-day move.',
      'Some corporate events matter far beyond one company. Results from the largest technology firms can sway the S&P 500 and the Nasdaq-100 on their own because those indexes are weighted by market value, and their spending plans ripple through suppliers across the market.',
    ],
    topics: [
      { title: 'Earnings reports', blurb: 'EPS, revenue, margins, guidance, and the difference between GAAP and adjusted results.', href: '/#earnings-reports' },
      { title: 'Analyst upgrades and downgrades', blurb: 'Why ratings skew positive and why the reasoning matters more than the label.', href: '/#analyst-upgrades-downgrades-and-price-targets' },
      { title: 'Buybacks and dividends', blurb: 'What a new authorization signals, ex-dividend dates, and when buybacks destroy value.', href: '/#share-buybacks-and-dividends' },
      { title: 'IPOs, offerings, and lockups', blurb: 'How new share issuance and insider lockup expirations create selling pressure.', href: '/#ipos-secondary-offerings-and-lockup-expirations' },
      { title: 'Mergers and corporate actions', blurb: 'Deal spreads, spin-offs, splits, executive exits, and regulatory decisions.', href: '/#mergers-acquisitions-and-other-corporate-actions' },
      { title: 'SEC filings that move stocks', blurb: 'Form 8-K, Form 4 insider trades, and Schedule 13D activist stakes.', href: '/#sec-filings-that-act-as-triggers' },
    ],
    watch: [
      'Full-year guidance compared with analysts’ consensus estimates',
      'Whether a beat came from higher sales or from cost cuts and one-time items',
      'Comments on the conference call about demand, pricing, and spending plans',
      'How peers and suppliers trade the day after a major company reports',
    ],
    faq: [
      { question: 'Why does a stock fall after beating earnings estimates?', answer: 'The beat may have been expected already, the company may have lowered its outlook, or the quality of the beat may have been weak, such as relying on one-time gains rather than stronger demand.' },
      { question: 'When do companies report earnings?', answer: 'U.S. public companies report quarterly. Earnings season starts a few weeks after each calendar quarter ends, and large banks are usually among the first major companies to report.' },
      { question: 'Where can I read a company’s official filings?', answer: 'Quarterly reports (Form 10-Q), annual reports (Form 10-K), and material event reports (Form 8-K) are free on the SEC’s EDGAR database.' },
    ],
    sources: [
      { name: 'SEC EDGAR full-text search', url: 'https://www.sec.gov/edgar/search/' },
    ],
  },

  'market-sectors': {
    slug: 'market-sectors',
    label: 'Market Sectors',
    title: 'Market Sectors: How Each Part of the Market Reacts',
    heading: 'Market Sectors',
    description:
      'Why technology, financials, energy, health care, real estate, consumer, and industrial stocks react differently to the same inflation, rate, and growth news.',
    image: { slug: 'oil-pumpjacks', alt: 'Oil pumpjacks silhouetted against an orange sunset in West Texas' },
    intro: [
      'The S&P 500 is split into eleven sectors under the Global Industry Classification Standard. Each one has its own sensitivity to interest rates, commodity prices, and the business cycle, so a single market trigger rarely affects them all the same way.',
      'A useful first split is cyclical versus defensive. Cyclical sectors such as consumer discretionary, industrials, materials, financials, and energy tend to do better when the economy is expanding. Defensive sectors such as consumer staples, health care, and utilities sell things people keep buying in a downturn, so they often hold up better when growth worries rise.',
      'Watching which sectors lead and lag tells you a lot about what investors are thinking, often before the overall index moves much. A shift toward defensives can be an early sign of growing concern about the economy.',
    ],
    topics: [
      { title: 'Cyclical vs. defensive sectors', blurb: 'Which sectors lead in expansions, which hold up in slowdowns, and what rotations signal.', href: '/#cyclical-vs-defensive-sectors' },
      { title: 'Sector reactions at a glance', blurb: 'A table of commonly observed tendencies for all major sectors.', href: '/#how-each-sector-tends-to-respond-to-common-triggers' },
      { title: 'Rate-sensitive sectors', blurb: 'Why utilities, REITs, homebuilders, and banks respond to yields in different ways.', href: '/#interest-rate-sensitive-sectors' },
      { title: 'Commodity-sensitive sectors', blurb: 'Oil, natural gas, metals, and how energy prices spill into airlines and retailers.', href: '/#commodity-sensitive-sectors' },
      { title: 'Growth vs. value', blurb: 'Why long-duration growth stocks are more sensitive to long-term interest rates.', href: '/#growth-vs-value' },
      { title: 'Large caps vs. small caps', blurb: 'What the Russell 2000 says about domestic growth and borrowing costs.', href: '/#large-caps-vs-small-caps' },
    ],
    watch: [
      'Relative performance of defensive sectors versus cyclical sectors',
      'Moves in the 10-year Treasury yield, which weigh on rate-sensitive groups',
      'Weekly U.S. crude inventory data from the Energy Information Administration',
      'Small-cap performance relative to large caps as a read on domestic growth',
    ],
    faq: [
      { question: 'How many sectors are in the S&P 500?', answer: 'Eleven, under the Global Industry Classification Standard: Information Technology, Health Care, Financials, Consumer Discretionary, Communication Services, Industrials, Consumer Staples, Energy, Utilities, Real Estate, and Materials.' },
      { question: 'Which sectors do best when interest rates fall?', answer: 'Rate-sensitive groups such as real estate, utilities, and long-duration growth stocks have often benefited from falling yields, though the reason rates are falling matters. Cuts made because of a weakening economy can coincide with weaker stocks overall.' },
      { question: 'What is sector rotation?', answer: 'Sector rotation is the movement of investor money from one part of the market to another as expectations for growth, inflation, and interest rates change.' },
    ],
    sources: [
      { name: 'U.S. Energy Information Administration', url: 'https://www.eia.gov/' },
      { name: 'FRED economic data (St. Louis Fed)', url: 'https://fred.stlouisfed.org/' },
    ],
  },

  'investor-education': {
    slug: 'investor-education',
    label: 'Investor Education',
    title: 'Investor Education: How Financial Markets Work',
    heading: 'Investor Education',
    description:
      'Plain-English guides to how markets work: bull and bear markets, volatility, the VIX, stocks vs. bonds, interest rates, inflation, and managing risk.',
    image: { slug: 'notebook-chart', alt: 'Open notebook with a hand-drawn line chart beside a pen, reading glasses and a cup of coffee' },
    intro: [
      'Understanding why a market moved starts with understanding how markets work in the first place. These guides cover the foundations: what a correction or bear market actually is, how stocks, bonds, and the dollar relate to each other, what volatility measures, and how interest rates and inflation feed into investment returns.',
      'A stock’s price can be thought of as the present value of the cash its business will produce in the future. Raise expected cash flows and the value goes up. Raise the interest rate used to discount those cash flows, or the extra return investors demand for taking risk, and the value goes down. Nearly every concept in this section comes back to those three levers.',
      'None of this is about predicting tomorrow’s price. It is about having a clear framework so that headlines make sense, and so that short-term swings are easier to put in context.',
    ],
    topics: [
      { title: 'Bull markets, bear markets, and corrections', blurb: 'The conventional thresholds and what they do and do not mean.', href: '/#bull-markets-bear-markets-and-corrections' },
      { title: 'Stocks, bonds, and the dollar', blurb: 'How the three move together and why the relationship changes when inflation is high.', href: '/#stocks-bonds-and-the-dollar-how-they-move-together' },
      { title: 'Interest rates and stock valuations', blurb: 'Discounting, competition from bonds, and borrowing costs explained simply.', href: '/#interest-rates-and-stock-valuations' },
      { title: 'The VIX and volatility', blurb: 'What the market’s fear gauge measures and how to read it.', href: '/#the-volatility-index-vix' },
      { title: 'What "priced in" means', blurb: 'Why expected news rarely moves markets and how futures reveal expectations.', href: '/#priced-in-what-it-means-and-why-it-matters' },
      { title: 'Risk management basics', blurb: 'Time horizon, diversification, costs, and why certainty is a red flag.', href: '/#risk-management-using-market-triggers-responsibly' },
    ],
    watch: [
      'Your own time horizon before reacting to any single day’s move',
      'Whether stocks and bonds are moving together or in opposite directions',
      'The VIX alongside stock prices to judge whether a pullback is ordinary or stressful',
      'Costs and taxes that frequent trading adds up over time',
    ],
    faq: [
      { question: 'What is the difference between a correction and a bear market?', answer: 'A correction is commonly defined as a decline of 10% or more from a recent high. A bear market is commonly defined as a decline of 20% or more. Both are conventions used by investors and the media, not official designations.' },
      { question: 'Why do bond prices fall when interest rates rise?', answer: 'Existing bonds pay fixed interest. When new bonds offer higher rates, older bonds become less attractive, so their prices fall until their effective yield matches the market.' },
      { question: 'Is understanding market triggers a reason to trade more often?', answer: 'No. Knowing why markets move helps with context and decision-making, but frequent trading on headlines tends to raise costs and risk. For personal decisions, consider a licensed financial professional.' },
    ],
    sources: [
      { name: 'Investor.gov (U.S. Securities and Exchange Commission)', url: 'https://www.investor.gov/' },
      { name: 'Federal Reserve: monetary policy basics', url: 'https://www.federalreserve.gov/monetarypolicy.htm' },
    ],
  },

  'market-events': {
    slug: 'market-events',
    label: 'Market Events',
    title: 'Market Events: Fed Meetings, Data Releases and What to Watch',
    heading: 'Market Events',
    description:
      'A guide to the scheduled events that move U.S. markets: FOMC meetings, CPI and jobs report days, earnings season, options expiration, and index rebalancing.',
    image: { slug: 'washington-columns', alt: 'Neoclassical marble government building with columns in Washington, D.C., framed by cherry blossoms at dusk' },
    intro: [
      'Markets often move before an event, not just after it. Traders position ahead of Federal Reserve meetings, inflation reports, and big earnings releases, and the price action in the days beforehand can tell you a lot about what is expected.',
      'Most market-moving events follow a predictable calendar. The Federal Open Market Committee holds eight scheduled meetings a year. The jobs report usually lands on the first Friday of the month, inflation data around mid-month, and earnings season starts a few weeks after each quarter ends. Monthly options typically expire on the third Friday.',
      'This section explains what each type of event is, why investors care, and what details tend to matter most when it arrives, so you can follow along instead of being surprised.',
    ],
    topics: [
      { title: 'A typical week of market triggers', blurb: 'The recurring rhythm of releases, from Thursday jobless claims to mid-month CPI.', href: '/#a-typical-week-of-us-market-triggers' },
      { title: 'What moves markets on Fed day', blurb: 'The statement, the dot plot, the press conference, and the minutes.', href: '/#what-actually-moves-markets-on-fed-day' },
      { title: 'Index rebalancing and options expiration', blurb: 'Mechanical flows that can move prices without new information.', href: '/#index-rebalancing-options-expiration-and-flows' },
      { title: 'Market-wide circuit breakers', blurb: 'The 7%, 13%, and 20% thresholds that pause trading in a panic.', href: '/#market-wide-circuit-breakers' },
      { title: 'Fiscal policy, trade, and regulation', blurb: 'Tariffs, debt-ceiling debates, and rule changes that reshape industries.', href: '/#fiscal-policy-trade-and-regulation' },
      { title: 'The 6-step trigger framework', blurb: 'A repeatable checklist for reading any event as it happens.', href: '/#how-to-analyze-any-market-trigger-in-6-steps' },
    ],
    watch: [
      'Implied probabilities for the next Fed decision from fed funds futures',
      'The official release calendars from the BLS, BEA, and Census Bureau',
      'Earnings dates for the largest companies in the S&P 500',
      'The third Friday of each month for options expiration',
    ],
    faq: [
      { question: 'How often does the Federal Reserve meet?', answer: 'The Federal Open Market Committee holds eight regularly scheduled meetings per year and can meet between them if conditions require.' },
      { question: 'What time do major U.S. economic reports come out?', answer: 'Many major government reports, including CPI and the jobs report, are released at 8:30 a.m. Eastern Time, before the regular trading session opens at 9:30 a.m. ET.' },
      { question: 'What is a "dot plot"?', answer: 'It is a chart in the Fed’s quarterly Summary of Economic Projections showing where each policymaker expects the federal funds rate to be at the end of upcoming years.' },
    ],
    sources: [
      { name: 'Federal Reserve FOMC meeting calendar', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
      { name: 'Investor.gov: stock market circuit breakers', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/stock-market-circuit-breakers' },
    ],
  },
};
