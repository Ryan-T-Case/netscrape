var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");

var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 8080;

// Initialize Express
var app = express();

// Configure middleware
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));

// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

//Sets up handlebars
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/netscrape";
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);

// Routes

// A GET route for scraping 
app.get("/scrape", function (req, res) {
    // Use request to grab the body of the website
    request("https://www.allsides.com/unbiased-balanced-news", function (error, response, html) {
        // Load body into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);

        // Grabs every div with class 'top-content-wrapper' and iterates through with the function below
        $(".top-content-wrapper").each(function (i, element) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .find(".news-title a")
                .text();
            result.link = $(this)
                .find(".news-title a")
                .attr("href");
            //Grabs text out of .news-body div and saves to result.body
            result.body = $(this)
                .find(".news-body")
                .text();
            result.note = [];

            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log('\n\n\nscrape complete! \n\n\n')
                    console.log(dbArticle)
                })
                .catch(function (err) {
                    // If an error occurred, send it to the client
                    return res.json(err);
                });
                
        });

        // If we were able to successfully scrape reload template with new saved articles.
        res.redirect('/')
    });
});

// Route for getting all Articles from the db
app.get("/", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.render("index", { articles: dbArticle });
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for getting all Articles from the db
app.get("/saved", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.render("saved", { articles: dbArticle });
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            // Find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- 
            return db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: {note: dbNote._id}}, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.put("/articles/db/:id", function (req, res) {
    var id = req.params.id;
    //Updates Note in DB
    db.Note.findOneAndUpdate( { _id: req.params.id }, req.body)
        .then(function (dbNote) {
            console.log(dbNote);
            res.json(dbNote)
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

//Route for saving/deleting articles
app.put("/articles/saved/:id", function (req, res) {
    // Updates article to include saved boolean
    db.Article.findOneAndUpdate( { _id: req.params.id }, { $set: { saved: req.body.saved }})
        .then(function (dbArticle) {
            res.json(dbArticle)
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

app.delete("/comments/:id", function (req, res) {
    db.Note.deleteOne({_id: req.params.id})
        .then(function(dbNote) {
            res.json(dbNote)
        })
        .catch(function(err) {
            res.json(err);
        })
})

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
