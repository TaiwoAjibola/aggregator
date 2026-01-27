export type FeedConfig = {
  sourceName: string;
  rssUrl: string;
};

// Add or remove feeds as needed. RSS endpoints can change; verify periodically.
export const FEEDS: FeedConfig[] = [
  { sourceName: "Premium Times", rssUrl: "https://www.premiumtimesng.com/feed" },
  { sourceName: "Punch", rssUrl: "https://punchng.com/feed" },
  { sourceName: "Vanguard", rssUrl: "https://www.vanguardngr.com/feed/" },
  { sourceName: "Channels TV", rssUrl: "https://www.channelstv.com/feed/" },
  { sourceName: "BusinessDay", rssUrl: "https://businessday.ng/feed/" },
  { sourceName: "ThisDay", rssUrl: "https://www.thisdaylive.com/feed/" },
  { sourceName: "Nigerian Tribune", rssUrl: "https://tribuneonlineng.com/feed/" },
  { sourceName: "Nairametrics", rssUrl: "https://nairametrics.com/feed/" },
  { sourceName: "Daily Post", rssUrl: "https://dailypost.ng/feed/" },
];
