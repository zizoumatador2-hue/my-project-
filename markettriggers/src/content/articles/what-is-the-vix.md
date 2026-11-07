---
title: "What Is the VIX? The Market's Fear Gauge Explained"
description: "What is the VIX? How Cboe's volatility index is built from S&P 500 options, how to turn a reading into an expected move, and what its spikes do and don't mean."
publishDate: 2026-11-07
category: investor-education
series: investor-guide
primaryKeyword: "what is the vix"
secondaryKeywords: ["VIX index", "volatility index", "fear gauge"]
image: storm-skyline
imageAlt: "Silhouette of a city skyline with a tall spired tower at its center, under dark storm clouds parting around a patch of bright sky"
faq:
  - question: "What is a normal VIX level?"
    answer: "There is no official normal range. DataTrek Research puts the VIX's long-run average at about 19.5, and readings above 40 are rare: SIFMA counted 190 such days since 2000, about 3% of trading days. A reading in the low teens signals calm options pricing, while the 30s and 40s usually accompany a sharp sell-off."
  - question: "Does a high VIX mean stocks will keep falling?"
    answer: "No. The VIX describes how much movement options traders are paying to protect against over the next 30 days, in either direction. It does not forecast direction. Spikes often happen near the worst of a sell-off, and the index tends to drift back toward its long-run average once the panic eases."
  - question: "Can you buy the VIX?"
    answer: "Not directly. FINRA notes that the VIX itself is not investible. Investors get exposure through VIX futures, VIX options or exchange-traded products that hold futures. Those products do not track the index one-for-one, and the SEC has warned that many are designed for very short holding periods."
  - question: "Why is the VIX called the fear gauge?"
    answer: "The nickname comes from its tendency to jump when stocks drop. When investors rush to buy S&P 500 put options for protection, option prices rise and so does the VIX. Cboe's own analysis finds the VIX and the S&P 500 move in the same direction only about 20% of the time."
---

**What is the VIX? It is Cboe's volatility index, a real-time number that shows how much movement options traders expect from the S&P 500 over the next 30 days. A VIX of 20 implies an annualized swing of about 20%. It usually jumps when stocks fall, which is why people call it the fear gauge.**

The VIX shows up in nearly every story about a rough day on Wall Street, often with a percentage change attached that sounds alarming on its own. This week was a good example. On Thursday, November 5, the Dow fell 1,833 points and the Nasdaq Composite slid into correction territory, according to [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-thursday-november-5-dow-sp-500-nasdaq-plunge-chip-stocks-melt-down-193726491.html). By late morning the VIX had already jumped more than 65%. A 65% jump sounds huge. Whether it is depends on where the index started, and knowing how the number is built tells you more than the headline. For the bigger picture on what drives stock prices, see our [guide to what moves the stock market](/) and the [investor education hub](/investor-education/).

## What is the VIX, exactly?

Cboe's methodology says the VIX is designed to measure "the market's expectation of 30-day forward looking volatility of the U.S. equity market." It does that by reading prices from S&P 500 index options, not from stock prices themselves.

Here is the logic. An option is a form of insurance. When investors expect large moves, they pay more for that insurance, and option premiums rise. Cboe takes a wide range of out-of-the-money put and call prices on the S&P 500, blends two sets of expirations that bracket a 30-day window, and boils them down to one figure. The result is expressed as a percentage, the way you'd quote an annualized standard deviation.

A few details from the [Cboe methodology](https://cdn.cboe.com/resources/indices/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf) are worth knowing:

- It uses standard monthly SPX options and weekly SPXW options, priced at the midpoint between bid and ask.
- It is calculated about four times a minute during regular hours, roughly 9:31 a.m. to 4:15 p.m. Eastern, with a separate overnight session.
- It looks forward. The VIX is built from what traders are paying today for protection over the coming month, not from how much stocks moved last month.

That last point is the one most people miss. A calm week can still come with a high VIX if traders are worried about something on the calendar, such as a [Fed meeting](/articles/fomc-meeting-day-what-to-watch/) or a big earnings report.

### A short history

| Year | Milestone |
| --- | --- |
| 1993 | Cboe introduces the VIX, based on at-the-money S&P 100 options |
| 2003 | Methodology revised with Goldman Sachs to use S&P 500 options across many strikes |
| 2004 | VIX futures begin trading on March 26 on Cboe Futures Exchange |
| 2006 | VIX options are added |
| 2023 | VIX futures volume reaches 53.7 million contracts |

*Sources: [Cboe methodology](https://cdn.cboe.com/resources/indices/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf) and [Cboe Global Markets](https://ir.cboe.com/news/news-details/2024/Cboe-Global-Markets-Commemorates-20-Years-of-Cboe-Futures-Exchange-and-VIX-Futures-Trading/default.aspx). Cboe has calculated values back to January 1990.*

## How to turn a VIX reading into an expected move

The VIX is quoted in annual terms, which isn't very useful on its own when you care about next month or tomorrow. Cboe's [own walkthrough](https://www.cboe.com/insights/posts/inside-volatility-trading-breaking-down-the-vix-index-and-its-correlation-to-the-s-p-500-index) offers a simple conversion: divide by the square root of the number of periods in a year.

- **One month:** divide by the square root of 12 (about 3.46).
- **One week:** divide by the square root of 52 (about 7.2).
- **One day:** Cboe's example divides by the square root of 365 (about 19.1), since the index uses calendar days.

The result is roughly a one-standard-deviation move, which in a textbook bell curve covers about 68% of outcomes. It can go either way.

| VIX level | Implied 1-month move | Implied 1-week move | Implied 1-day move |
| --- | --- | --- | --- |
| 12 | ±3.5% | ±1.7% | ±0.6% |
| 15 | ±4.3% | ±2.1% | ±0.8% |
| 20 | ±5.8% | ±2.8% | ±1.1% |
| 30 | ±8.7% | ±4.2% | ±1.6% |
| 45 | ±13.0% | ±6.2% | ±2.4% |
| 82.69 (March 2020 record close) | ±23.9% | ±11.5% | ±4.3% |

*Our arithmetic using the Cboe conversion. These are rough, symmetric estimates; real returns have fatter tails than a bell curve.*

So a VIX at 20 says options are priced for the S&P 500 to land within about 5.8% of where it is now, a month from now, roughly two times in three. At 30, that band widens to almost 9%. It's a useful way to translate a headline number into something you can picture.

Two cautions. First, the VIX is an implied number, and it often runs above the volatility that actually follows, because investors pay up for insurance. Second, the bell curve understates crash risk. Days like the 12% S&P 500 drop on March 16, 2020, which [CNBC reported](https://www.cnbc.com/2020/03/16/wall-streets-fear-gauge-hits-highest-level-ever.html), happen far more often than a normal distribution would predict.

## Why it gets called the fear gauge

The VIX tends to move opposite the S&P 500. Cboe's analysis finds the two move in the same direction only about 20% of the time. The reason is mostly about who buys options and when.

When stocks slide, portfolio managers rush to buy S&P 500 puts to protect their holdings. Demand pushes up put prices, and the VIX rises with them. When stocks grind higher, that demand fades and the index tends to settle. Rallies rarely cause the same scramble for protection, so a 3% up day usually does far less to the VIX than a 3% down day.

That asymmetry is why the index works as a mood ring. It captures the price of protection, and people pay the most for protection when they're scared.

It is not a perfect one, though. Cboe notes the inverse relationship "is not always maintained." The VIX can rise alongside stocks ahead of a big event, or stay low during a slow, orderly decline that never sparks panic buying of puts.

## What different VIX levels have looked like

There's no official scale, but some reference points help.

**The long-run average.** Nicholas Colas of DataTrek Research puts the VIX's long-run mean at about 19.5, as [reported by Dow Jones](https://itiger.com/news/2525049751) in April 2025.

**Above 40 is rare.** SIFMA counted [190 days above 40 since 2000](https://www.sifma.org/resources/research/insights/market-musings-vix), about 3.0% of trading days. Most of them came during the 2008 financial crisis and the start of the pandemic. Colas's figures, which go back further, put closes above 40 at 2.3% of the time.

**The record.** The VIX closed at 82.69 on March 16, 2020, according to [CNBC](https://www.cnbc.com/2020/03/16/wall-streets-fear-gauge-hits-highest-level-ever.html). That topped the previous closing record of 80.74 from November 21, 2008.

Here are a few recent episodes worth knowing:

| Date | What happened | VIX |
| --- | --- | --- |
| Nov 21, 2008 | Financial crisis | Record close at the time, 80.74 |
| Mar 16, 2020 | Pandemic sell-off; S&P 500 down 12% | Record close, 82.69 |
| Aug 5, 2024 | Global sell-off | Rose about 180% to almost 66 before the open |
| Apr 4, 2025 | Tariff sell-off | Closed at 45.31, up 50.9% that day |
| Apr 7, 2025 | Sell-off continues | Closed at 46.98 |
| Nov 6, 2026 | Day after a 1,833-point Dow drop | Closed at 25.64, down 2.54 points |

*Sources: [CNBC](https://www.cnbc.com/2020/03/16/wall-streets-fear-gauge-hits-highest-level-ever.html), [BIS](https://www.bis.org/publ/bisbull95.htm), [Dow Jones via Tiger Brokers](https://itiger.com/news/2525049751), [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-friday-november-6-dow-sp-500-nasdaq-jobs-report-earnings-135953863.html).*

The August 2024 spike deserves a note. The Bank for International Settlements called it the biggest one-day spike on record, bigger than anything in 2008 or March 2020. Yet the stock market damage was far smaller than in either crisis. The BIS traced part of the overshoot to the fact that the VIX is "based on quotes instead of trades." In thin early trading, dealers widened their bid-ask spreads on put options, and the calculation picked that up. The lesson: a dramatic VIX print in a quiet pre-market session isn't the same as a market in free fall.

## Reading this week's move

Put this week in that context. A jump of more than 65% in one session is large in percentage terms. But the index started from a low enough base that it was still in the mid-to-high 20s, and by Friday it [closed at 25.64](https://finance.yahoo.com/markets/live/stock-market-today-friday-november-6-dow-sp-500-nasdaq-jobs-report-earnings-135953863.html), a little above the long-run average. Using the table above, that implies a one-month S&P 500 band of about plus or minus 7.4%. Elevated, yes. Nowhere near the 45-plus closes of April 2025 or the 80s of 2008 and 2020.

That's why percentage changes in the VIX can mislead. Going from 12 to 20 is a 67% rise, and it still leaves the index near its historical average. Going from 40 to 60 is a 50% rise that signals real stress. Look at the level, not just the change.

It also helps to connect a spike to its trigger. Thursday's slide was led by chip and AI stocks, according to Yahoo Finance. That's a different situation from a recession scare or an inflation surprise, and the follow-through can differ too. Our piece on [stock market corrections vs. bear markets](/articles/stock-market-correction-vs-bear-market/) shows how often sharp drops stop short of something worse, and why the cause matters more than the label.

## The VIX doesn't predict direction

A rising VIX means options are pricing larger moves. It doesn't say which way. Spikes often arrive near the worst point of a sell-off, simply because that's when the scramble for protection peaks. Cboe also notes the index generally tends to revert toward its long-term average over time.

That doesn't make a high reading a buy signal, and it doesn't make a low reading safe. A VIX in the low teens tells you protection is cheap, not that nothing can go wrong. A reading is best used as context: how nervous is the options market right now, compared with its history?

The VIX also says nothing about any single stock. A company can drop 20% after [disappointing guidance](/articles/why-do-stocks-fall-after-earnings/) while the index barely moves.

## Why you can't just buy the VIX

Many investors first wonder whether they can trade fear directly. You can't. As [FINRA puts it](https://syndication.finra.org/node/326), "the VIX itself is not investible." Exposure comes through VIX futures, VIX options or exchange-traded products that hold futures.

Those instruments don't track the spot index one-for-one, and FINRA notes the link generally gets weaker the further out the futures go. Some volatility products can lose most or all of their value in a short time. FINRA describes inverse volatility products that had returned over 180% in 2017, then collapsed; one no longer trades. It also says these products are generally not designed to be used as buy-and-hold investments.

The SEC has made the same point. In a [2020 statement](https://www.sec.gov/news/public-statement/ocie-vix-matters-2020-11-16), the agency's examinations staff noted that VIX-linked products were "intended as short-term investments," and that some may not be suitable for investors planning to hold them for longer than one trading session. If you're considering any of them, read the prospectus closely, and remember that a product's long-run results can look very different from the VIX chart you see on TV.

<div class="callout callout--watch">
<strong>What to watch next:</strong> Scheduled events can lift the VIX before they happen. Coming up are the October CPI on November 10 and the PPI on November 13, per the <a href="https://www.bls.gov/schedule/">BLS schedule</a>, followed by the <a href="https://www.federalreserve.gov/newsevents/2026-december.htm">December 8-9 FOMC meeting</a>. Watch the VIX level against its long-run average near 19.5, whether it falls back after each release, and whether big tech and chip stocks keep leading the swings.
</div>

This article is educational and is not personalized investment advice.

## Related reading

- [Stock market correction vs. bear market: what's the difference?](/articles/stock-market-correction-vs-bear-market/)
- [FOMC meeting explained: what to watch, hour by hour](/articles/fomc-meeting-day-what-to-watch/)
- [How interest rates affect stock valuations](/articles/how-interest-rates-affect-stock-valuations/)
- [How the jobs report moves the stock market](/articles/how-the-jobs-report-moves-the-stock-market/)
- [Why do stocks fall after beating earnings?](/articles/why-do-stocks-fall-after-earnings/)
- [Investor education: core market concepts](/investor-education/)

## Sources

- [Cboe: Volatility Index Methodology, Cboe Volatility Index](https://cdn.cboe.com/resources/indices/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf)
- [Cboe Insights: Breaking down the VIX Index and its correlation to the S&P 500 Index](https://www.cboe.com/insights/posts/inside-volatility-trading-breaking-down-the-vix-index-and-its-correlation-to-the-s-p-500-index)
- [Cboe Global Markets: 20 years of Cboe Futures Exchange and VIX futures trading](https://ir.cboe.com/news/news-details/2024/Cboe-Global-Markets-Commemorates-20-Years-of-Cboe-Futures-Exchange-and-VIX-Futures-Trading/default.aspx)
- [FINRA: Volatility investing, not for the faint of heart](https://syndication.finra.org/node/326)
- [SEC: Statement on enforcement matters involving VIX-related and other complex products, November 2020](https://www.sec.gov/news/public-statement/ocie-vix-matters-2020-11-16)
- [Bank for International Settlements: Anatomy of the VIX spike in August 2024](https://www.bis.org/publ/bisbull95.htm)
- [SIFMA: Market Musings, VIX, April 2025](https://www.sifma.org/resources/research/insights/market-musings-vix)
- [Dow Jones via Tiger Brokers: VIX closes of April 4 and 7, 2025, and DataTrek long-run average](https://itiger.com/news/2525049751)
- [CNBC: Wall Street's fear gauge hits highest level ever, March 16, 2020](https://www.cnbc.com/2020/03/16/wall-streets-fear-gauge-hits-highest-level-ever.html)
- [Yahoo Finance: Stock market today, November 5, 2026](https://finance.yahoo.com/markets/live/stock-market-today-thursday-november-5-dow-sp-500-nasdaq-plunge-chip-stocks-melt-down-193726491.html)
- [Yahoo Finance: Stock market today, November 6, 2026](https://finance.yahoo.com/markets/live/stock-market-today-friday-november-6-dow-sp-500-nasdaq-jobs-report-earnings-135953863.html)
- [BLS: Schedule of selected releases](https://www.bls.gov/schedule/)
- [Federal Reserve: Calendar, December 2026](https://www.federalreserve.gov/newsevents/2026-december.htm)
