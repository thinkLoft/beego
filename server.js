var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Our Puppeteer
const puppeteer = require("puppeteer");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost/unit18Populater";

mongoose.connect(
  MONGODB_URI,
  { useNewUrlParser: true }
);

// Load Puppeteer browser
async function postItem() {
  var user = {
    username: "automater",
    password: "llipDR3x8S2DUHAnyo"
  };
  console.log(user);

  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  await page.goto("https://doubleupja.com/login");
  await page.evaluate(() => {
    $("#login_username").val("automater");
    $("#login_password").val("llipDR3x8S2DUHAnyo");
    $("#login").click();
  });
  await page.goto("https://doubleupja.com/create-listing/");
  await page.evaluate(() => {
    $("#ad_cat_id").val("10");
    document.getElementById("getcat").style.display = "block";
    $("#getcat").click();
  });
  await console.log(page.url());
  // await browser.close();
}

// AutoAds Scraper Function
function scrapePage(page) {
  axios.get(page).then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".thumbnail").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children(".description")
        .children("h4")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      result.img = $(this)
        .children("a")
        .children("img")
        .attr("src");
      result.price = $(this)
        .children(".description")
        .children("span")
        .text()
        .trim()
        .replace(/[^0-9]/g, "");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result).catch(function(err) {
        // If an error occurred, send it to the client
        return res.json(err);
      });
    });
  });
}

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.autoadsja.com/search.asp").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".thumbnail").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children(".description")
        .children("h4")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      result.img = $(this)
        .children("a")
        .children("img")
        .attr("src");
      result.price = $(this)
        .children(".description")
        .children("span")
        .text()
        .trim()
        .replace(/[^0-9]/g, "");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result).catch(function(err) {
        // If an error occurred, send it to the client
        return res.json(err);
      });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { note: dbNote._id },
        { new: true }
      );
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for deleting all Articles from the db
app.get("/clear", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.remove({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// // Route for getting all Articles from the db
app.get("/crawl", function(req, res) {
  axios.get("https://www.autoadsja.com/rss.asp").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data, { xmlMode: true });

    $("item").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.link = $(this)
        .children("link")
        .text();
      result.title = $(this)
        .children("title")
        .text();
      result.img = $(this)
        .children("description")
        .text();
      // Create a new CRAWLER LIST using the `result` object built from scraping
      db.Feed.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          return res.json(err);
        });
    });
  });
});

// Route for deleting all Articles from the db
app.get("/clearCrawl", function(req, res) {
  // Grab every document in the Articles collection
  db.Feed.remove({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for getting all Articles from the db
app.get("/feed", function(req, res) {
  // Grab every document in the Articles collection
  db.Feed.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for getting all Articles from the db
app.get("/scrapeAds", function(req, res) {
  // Grab every document in the Articles collection
  db.Feed.find({})
    .then(function(dbArticle) {
      var result = [];

      dbArticle.forEach(function(i, element) {
        result.push(i.link);
      });
      res.json(result);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for deleting all Articles from the db
app.get("/postItem", function(req, res) {
  // postItem();
  // // Grab every document in the Articles collection
  // db.Feed.find({})
  //   .then(function(dbArticle) {
  //     // If we were able to successfully find Articles, send them back to the client
  //     res.json(dbArticle);
  //   })
  //   .catch(function(err) {
  //     // If an error occurred, send it to the client
  //     res.json(err);
  //   });
  res.send("FinishedPosting");
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
