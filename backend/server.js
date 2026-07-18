const http = require("http");
const url = require("url");
// ============ AUCTION DATA ============
const auctions = [
  {
    id: "a1",
    title: "1987 Nintendo NES Console",
    image: "🎮",
    startPrice: 100,
    currentBid: 100,
    currentBidder: null,
    endsAt: Date.now() + 180000,
    status: "active",
    bidHistory: [],
  },
  {
    id: "a2",
    title: "Vintage Polaroid Camera",
    image: "📸",
    startPrice: 50,
    currentBid: 50,
    currentBidder: null,
    endsAt: Date.now() + 240000,
    status: "active",
    bidHistory: [],
  },
  {
    id: "a3",
    title: "First Edition Harry Potter",
    image: "📚",
    startPrice: 200,
    currentBid: 200,
    currentBidder: null,
    endsAt: Date.now() + 120000,
    status: "active",
    bidHistory: [],
  },
  {
    id: "a4",
    title: "Signed Beatles Vinyl",
    image: "🎵",
    startPrice: 500,
    currentBid: 500,
    currentBidder: null,
    endsAt: Date.now() + 300000,
    status: "active",
    bidHistory: [],
  },
  {
    id: "a5",
    title: "Retro Arcade Machine",
    image: "👾",
    startPrice: 150,
    currentBid: 150,
    currentBidder: null,
    endsAt: Date.now() + 60000,
    status: "active",
    bidHistory: [],
  },
  {
    id: "a6",
    title: "Antique Pocket Watch",
    image: "⌚",
    startPrice: 75,
    currentBid: 75,
    currentBidder: null,
    endsAt: Date.now() + 360000,
    status: "active",
    bidHistory: [],
  },
];
let sseClients = [];
let bidSequence = 0;
// ============ SERVER QUIRKS (Documented for evaluators) ============
// QUIRK 1: POST /api/bid responds after 800-2500ms delay (simulates validation)
// QUIRK 2: SSE stream sometimes sends duplicate events (same bid_id twice)
// QUIRK 3: POST /api/bid returns 409 if auction ended between request and processing
// QUIRK 4: SSE events may arrive OUT OF ORDER (bid #5 before bid #4)
// QUIRK 5: Server sends "heartbeat" events every 15s — client must ignore these
// QUIRK 6: Every ~45s the SSE connection drops and must be re-established
// QUIRK 7: GET /api/auctions has a 30% chance of 500ms extra latency

// ============ ANTI-SNIPE (authoritative, server-owned) ============
// SNIPE_WINDOW_MS: an accepted bid inside this many ms of the current
// deadline counts as a snipe attempt.
// SNIPE_EXTENSION_MS: added to auction.endsAt when a snipe is detected.
const SNIPE_WINDOW_MS = 10_000;
const SNIPE_EXTENSION_MS = 15_000;

// Mutates auction.endsAt in place when bidTimestamp lands inside the final
// SNIPE_WINDOW_MS of the current deadline. Reusing auction.endsAt (which
// already reflects any prior extension) is what makes repeated accepted
// bids in the closing window stack extensions for free.
function applySnipeExtension(auction, bidTimestamp) {
  const remaining = auction.endsAt - bidTimestamp;
  if (remaining > 0 && remaining < SNIPE_WINDOW_MS) {
    auction.endsAt += SNIPE_EXTENSION_MS;
  }
}

function broadcast(event, data) {
  const id = ++bidSequence;
  const msg = `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(msg);
    } catch (e) {
      /* client disconnected */
    }
  });
  // QUIRK 2: 20% chance of duplicate event (same data, same id)
  if (Math.random() < 0.2) {
    setTimeout(
      () => {
        sseClients.forEach((res) => {
          try {
            res.write(msg);
          } catch (e) {}
        });
      },
      100 + Math.random() * 400,
    );
  }
  // QUIRK 4: 15% chance next event arrives before this one for new clients
  // (simulated by sometimes delaying the original)
}

// Check and close expired auctions
setInterval(() => {
  auctions.forEach((a) => {
    if (a.status === "active" && Date.now() >= a.endsAt) {
      a.status = "ended";
      broadcast("auction_ended", {
        auctionId: a.id,

        title: a.title,
        winner: a.currentBidder,
        finalPrice: a.currentBid,
        timestamp: Date.now(),
      });
    }
  });
}, 1000);
// QUIRK 5: Send heartbeat every 15 seconds
setInterval(() => {
  const msg = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(msg);
    } catch (e) {}
  });
}, 15000);
// QUIRK 6: Drop SSE connections every ~45 seconds
setInterval(() => {
  sseClients.forEach((res) => {
    try {
      res.end();
    } catch (e) {}
  });
  sseClients = [];
}, 45000);
// Simulated competing bidders (other "garage attendees")
setInterval(
  () => {
    const activeAuctions = auctions.filter((a) => a.status === "active");
    if (activeAuctions.length === 0) return;
    const auction =
      activeAuctions[Math.floor(Math.random() * activeAuctions.length)];
    const botNames = [
      "GarageGuy_Ron",
      "VintageVicki",
      "BidMaster3000",
      "NostalgiaNate",
    ];
    const botName = botNames[Math.floor(Math.random() * botNames.length)];
    const increment = [5, 10, 15, 20, 25][Math.floor(Math.random() * 5)];
    const newBid = auction.currentBid + increment;
    const bidTimestamp = Date.now();
    auction.currentBid = newBid;
    auction.currentBidder = botName;
    auction.bidHistory.push({
      bidder: botName,
      amount: newBid,
      timestamp: bidTimestamp,
    });
    applySnipeExtension(auction, bidTimestamp);
    broadcast("new_bid", {
      auctionId: auction.id,
      bidder: botName,
      amount: newBid,
      previousBid: newBid - increment,
      timestamp: bidTimestamp,
      bid_id: `bid_${bidTimestamp}_${Math.random().toString(36).substr(2, 5)}`,
      endsAt: auction.endsAt,
    });
  },
  8000 + Math.random() * 7000,
);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/auctions — list all auctions
  if (path === "/api/auctions" && req.method === "GET") {
    // QUIRK 7: 30% chance of extra 500ms latency
    const delay = Math.random() < 0.3 ? 500 : 0;
    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          auctions.map((a) => ({
            id: a.id,
            title: a.title,
            image: a.image,
            startPrice: a.startPrice,
            currentBid: a.currentBid,
            currentBidder: a.currentBidder,
            endsAt: a.endsAt,
            status: a.status,
            bidCount: a.bidHistory.length,
          })),
        ),
      );
    }, delay);
    return;
  }

  // GET /api/auctions/:id — single auction with bid history
  if (path.match(/^\/api\/auctions\/\w+$/) && req.method === "GET") {
    const id = path.split("/").pop();
    const auction = auctions.find((a) => a.id === id);
    if (!auction) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Auction not found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(auction));
    return;
  }

  // POST /api/bid — place a bid
  if (path === "/api/bid" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      // QUIRK 1: Artificial delay 800-2500ms
      const delay = 800 + Math.random() * 1700;
      setTimeout(() => {
        try {
          const { auctionId, bidder, amount } = JSON.parse(body);
          if (!auctionId || !bidder || !amount) {
            res.writeHead(400);
            res.end(
              JSON.stringify({
                error: "Missing required fields: auctionId, bidder, amount",
              }),
            );
            return;
          }
          const auction = auctions.find((a) => a.id === auctionId);
          if (!auction) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Auction not found" }));
            return;
          }

          // QUIRK 3: 409 if auction ended during the delay
          if (auction.status === "ended") {
            res.writeHead(409);
            res.end(
              JSON.stringify({
                error: "Auction has ended",
                winner: auction.currentBidder,
                finalPrice: auction.currentBid,
              }),
            );
            return;
          }
          if (amount <= auction.currentBid) {
            res.writeHead(400);
            res.end(
              JSON.stringify({
                error: "Bid must be higher than current bid",
                currentBid: auction.currentBid,
              }),
            );

            return;
          }
          const bidTimestamp = Date.now();
          const bid_id = `bid_${bidTimestamp}_${Math.random().toString(36).substr(2, 5)}`;

          auction.currentBid = amount;
          auction.currentBidder = bidder;
          auction.bidHistory.push({ bidder, amount, timestamp: bidTimestamp });
          applySnipeExtension(auction, bidTimestamp);
          broadcast("new_bid", {
            auctionId: auction.id,
            bidder,
            amount,
            previousBid: amount,
            timestamp: bidTimestamp,
            bid_id,
            endsAt: auction.endsAt,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              bid_id,
              currentBid: amount,
              message: `Bid of ${amount} placed successfully`,
            }),
          );
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      }, delay);
    });
    return;
  }

  // GET /api/stream — SSE stream for real-time updates
  if (path === "/api/stream" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(
      `event: connected\ndata: ${JSON.stringify({ message: "Connected to BidBlitz stream", timestamp: Date.now() })}\n\n`,
    );
    sseClients.push(res);
    req.on("close", () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});
server.listen(3005, () =>
  console.log("BidBlitz Mock Server running on http://localhost:3005"),
);
