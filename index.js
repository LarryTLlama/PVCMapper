let express = require("express");
var bodyParser = require('body-parser')
const discordWebhookURL = process.env.DISCORDWEBHOOKURL ?? "" // Insert here to receive delete requests via discord
const dotenv = require("dotenv")
dotenv.config();
let app = express();
var jsonParser = bodyParser.json({ limit: "7mb" })
var rawParser = bodyParser.raw({ limit: "7mb" })
let path = require("path")
var swearjar = require('swearjar');
let googlesecretkey = process.env.GOOGLERECAPTCHAKEY ?? "" // Insert google recpatcha key
const { rateLimit } = require('express-rate-limit');

// Automatically serve everything in the /public directory on the root of this server.
// This includes all the base HTML webpages :)
app.use(express.static(path.join(__dirname, "public")))

// Insert API methods here...
// Base API path - /api
app.get("/api", (req, res) => res.json({ status: "OK", code: 200, notes: "Successful Request." }))

// Function to fetch players list
async function fetchPlayers() {
    try {
        return (await (await fetch("https://web.peacefulvanilla.club/maps/tiles/players.json")).json()).players;
    } catch (e) {
        return { error: "Server is offline, or Mapper couldn't fetch status!" }
    }
}

function generateLog(type, name, json, id, username, uuid) {
    return {
        "content": null,
        "embeds": [
            {
                "title": `New Place ${type}`,
                "description": name + ":\n```json\n" + json + "\n```",
                "url": "http://pvcmapper.my.to/place/" + id,
                "color": 13398528,
                "author": {
                    "name": username,
                    "url": "http://pvcmapper.my.to/profile/" + uuid,
                    "icon_url": "https://starlightskins.lunareclipse.studio/render/pixel/" + name + "/face/"
                },
                "timestamp": new Date().toISOString()
            }
        ],
        "attachments": []
    }
}

var playercache;

setInterval(async () => {
    playercache = (await fetchPlayers() ?? []);
    playercache.lastrefresh = new Date().toISOString()
    playercache.forEach((e) => {
        Player.upsert({
            uuid: e.uuid,
            username: e.name,
            lastjoin: new Date(),
            lastCheckedCoordinates: `${e.x}, ${e.z}`
        })
    })
}, 1500);

app.get("/api/v1/players", async (req, res) => {
    res.json(playercache);
})

// Setup database
const { Sequelize, DataTypes, Op } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:', {
    storage: require("path").join(__dirname, "database.sqlite"),
    // Prevent logging. We want to do this ourselves.
    logging: () => { }
});

// Basic user info. UUID is primary key.
const User = sequelize.define('User', {
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    sessionToken: DataTypes.STRING,
    sessionExpiration: DataTypes.DATE,
    uuid: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    profileStyle: DataTypes.STRING,
    profilePose: DataTypes.STRING,
    discord: DataTypes.STRING,
    wikiUsername: DataTypes.STRING,
    timezone: DataTypes.NUMBER,
    union: DataTypes.STRING
});

User.sync();

const Player = sequelize.define('Player', {
    username: DataTypes.STRING,
    uuid: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    lastjoin: DataTypes.DATE,
    lastCheckedCoordinates: DataTypes.STRING
})

Player.sync()

// Place info. ID is primary key
// CreatedBy and AddedBy includes user ID and name
const Place = sequelize.define('Place', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    x: DataTypes.NUMBER,
    z: DataTypes.NUMBER,
    wiki: DataTypes.STRING,
    createdBy: DataTypes.STRING,
    dateCreated: DataTypes.DATE,
    addedBy: DataTypes.JSON,
    type: DataTypes.STRING,
    hits: DataTypes.NUMBER,
    images: DataTypes.STRING,
    features: DataTypes.JSON,
    dimension: DataTypes.STRING,
    edits: {
        type: DataTypes.JSON,
        defaultValue: []
    }
});

Place.sync({alter: true});

const SmallPlace = sequelize.define("SmallPlace", {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    addedBy: DataTypes.STRING,
    type: DataTypes.STRING,
    x: DataTypes.NUMBER,
    z: DataTypes.NUMBER,
    dimension: DataTypes.STRING,
    name: DataTypes.STRING
})

SmallPlace.sync()

const Image = sequelize.define("Image", {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    uuid: DataTypes.UUID,
    data: DataTypes.BLOB,
    dataType: DataTypes.STRING
});

Image.sync()

const Area = sequelize.define('Area', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    wiki: DataTypes.STRING,
    type: DataTypes.STRING,
    dimension: DataTypes.STRING,
    image: DataTypes.STRING,
    bounds: DataTypes.JSON,
    addedBy: DataTypes.JSON,
    size: DataTypes.NUMBER,
    x: DataTypes.NUMBER,
    z: DataTypes.NUMBER,
    edits: {
        type: DataTypes.JSON,
        defaultValue: []
    }
});

Area.sync();

const Review = sequelize.define('Review', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    postedBy: DataTypes.JSON,
    postedOn: DataTypes.DATE,
    content: DataTypes.STRING,
    relatedPlace: DataTypes.NUMBER
})

Review.sync();

const Network = sequelize.define('Network', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    name: DataTypes.STRING,
    polyline: DataTypes.JSON,
    addedBy: DataTypes.JSON,
    addedOn: DataTypes.DATE
})

Network.sync()

setInterval(async () => {
    await User.sync();
    await Player.sync()
    await Place.sync()
    await Area.sync()
    await Network.sync()
    await Review.sync()
    console.log("[\x1b[33mPVC Mapper\x1b[0m] Database synchronised @ " + new Date().toISOString())
}, 60000 * 5)

// Function to get a random integer between a range of two numbers
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const GETlimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 150, // Limit each IP to 300 requests per `window`
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "You've just been rate limited. You can fetch things at 200 requests a minute. 🏎️"
})

const SEARCHLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 300, // Limit each IP to 300 requests per `window`
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "You've just been rate limited. You can fetch things at 200 requests a minute. 🏎️"
})

let signupcache = [{}]
async function generateNewVerificationCoordinates(username) {
    let players = await fetchPlayers();
    let player = players.find((element) => element.name == username);
    let coordsToVerify = [];
    let strategy = "";
    if (player) {
        coordsToVerify = [getRandomInt(player.x - 100, player.x + 100), getRandomInt(player.z - 100, player.z + 100)]
        strategy = "nearby";
    } else {
        coordsToVerify = [getRandomInt(-7500, 7500), getRandomInt(-7500, 7500)];
        strategy = "random";
    }
    return { coords: coordsToVerify, strategy: strategy };
}

// Signing up to the service:
// Yes, it's not a GET request, but it has *google protection* so can use the GET Limiter
app.post("/api/v1/signup/creation", GETlimiter, jsonParser, async (req, res) => {
    let body = req.body;
    if (await User.findOne({ where: { username: body.username } })) return res.json({ error: "You've already signed up. Log in instead?" });
    let google = await (await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        body: `secret=${googlesecretkey}&response=${body.captcha}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })).json();
    if (google.success) {

        if (signupcache.find((e) => e.username == body.username)) {
            // The username is already cached. Refresh the coordinates and return it.
            let coords = await generateNewVerificationCoordinates(body.username);
            body.coords = coords.coords;
            signupcache[signupcache.findIndex((e) => e.username == body.username)].coords = body;

            res.json(coords);
        } else {
            // Assuming username is valid. (We can manually verify this later ig).
            // Check to see if they're online. If not, we can just choose random coords
            let verificationCoords = await generateNewVerificationCoordinates(body.username);

            // This only holds data in memory until they verify.
            body.coords = verificationCoords.coords;
            signupcache.push(body);

            res.json(verificationCoords)
        }
    } else {
        return res.json({ error: "Google Recaptcha was unable to verify you're not a robot. Try again?" })
    }
})

function generatesessiontoken(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

function addMonths(date, months) {
    var d = date.getDate();
    date.setMonth(date.getMonth() + +months);
    if (date.getDate() != d) {
        date.setDate(0);
    }
    return date;
}

const bcrypt = require("bcrypt");

// Verificaion - Actually signing up to the service
app.get("/api/v1/signup/check", GETlimiter, async (req, res) => {
    let cachedinfo = signupcache.find((e) => e.username == req.query.username);
    if (!cachedinfo) {
        res.json({ error: "Session expired. Try going back and clicking register again." })
    }
    let players = await fetchPlayers();
    let result = players.find((e) => e.name == req.query.username);
    if (!result) {
        return res.json({ error: "We couldn't find you in game. Make sure you're logged in and standing at those coordinates to continue." })
    }
    if (result.x == cachedinfo.coords[0] && result.z == cachedinfo.coords[1] && result.world == "minecraft_overworld") {
        // WOO New user lessgo!
        console.log(`Account creation notification - ${cachedinfo.username} just signed up`)
        let newsessiontoken = generatesessiontoken(32);
        let expiry = addMonths(new Date(), 1).toISOString();
        let salt = await bcrypt.genSalt(12);
        let hash = await bcrypt.hash(cachedinfo.password, salt);

        User.create({
            username: cachedinfo.username,
            password: hash,
            sessionToken: newsessiontoken,
            sessionExpiration: expiry,
            uuid: result.uuid,
            profileStyle: "SquidInTheNether.png",
            profilePose: "default"
        });
        res.json({ status: "success", sessionToken: newsessiontoken, expires: expiry, uuid: result.uuid });
    } else {
        res.json({ error: "Looks like you're not at those coordinates. Make sure you're at those in the overworld!" });
    }
})

async function verifyAuthentication(body) {
    let u = await User.findOne({
        where: {
            uuid: body.uuid
        }
    });
    if (!u) return false;
    if (u.sessionToken == body.session) {
        if (u.sessionExpiration > new Date()) {
            // Authenticated! Hooray!
            return true;
        } else {
            // Prompt for another log-in, since it's been a month since they last logged in...
            return false;
        }
    } else {
        // That's not even the right token. LOLZ EPIK FAILLL
        return false;
    }
}

// Logging into the service
app.post("/api/v1/login", GETlimiter, jsonParser, async (req, res) => {
    let body = req.body;
    let u = await User.findOne({
        where: {
            username: body.username
        }
    });
    if (!u) return res.json({ error: "Incorrect username or password" });
    let compare = await bcrypt.compare(body.password, u.password);
    if (compare === true) {
        // Success! Huzzah!
        // Regenerate the session token#
        if (u.sessionExpiration < new Date()) {
            let token = generatesessiontoken(32);
            let expiry = addMonths(new Date(), 1);
            u.sessionToken = token;
            u.sessionExpiration = expiry;
            u.save();
        }
        return res.json({ status: "success", token: u.sessionToken, expiry: u.sessionExpiration, uuid: u.uuid });
    } else {
        return res.json({ error: "Incorrect username or password" });
    }
})

app.post("/api/v1/sessionVerify/:uuid", GETlimiter, jsonParser, async (req, res) => {
    let user = await User.findOne({
        where: {
            uuid: req.params.uuid
        }
    });
    if (!user) {
        return res.json({ verified: false });
    } else if ((user.sessionToken == req.body.sessionToken) && (new Date() < user.sessionExpiration)) {
        return res.json({ verified: true });
    } else {
        return res.json({ verified: false });
    }
})

// Editing user profile/details
app.post("/api/v1/setuserdetails/:type", GETlimiter, jsonParser, async (req, res) => {
    let body = req.body;
    let user = await User.findOne({
        where: {
            uuid: body.uuid
        }
    });
    if (!user) return res.json({ error: "Couldn't find user" });
    if (user.sessionToken = body.token) {
        if (user.sessionExpiration > new Date()) {
            if (req.params.type == "discord") {
                user.discord = body.content;
            } else if (req.params.type == "wiki") {
                user.wikiUsername = body.content;
            } else if (req.params.type == "style") {
                user.profileStyle = body.content;
            } else if (req.params.type == "pose") {
                user.profilePose = body.content;
            } else if (req.params.type == "timezone") {
                user.timezone = body.content;
            } else if (req.params.type == "union") {
                user.union = body.content;
            } else if (req.params.type == "password") {
                let verification = await bcrypt.compare(body.oldpswd, user.password);
                if (verification) {
                    console.log("[\x1b[33mPVC Mapper\x1b[0m] Password change issued to " + user.username)
                    let salt = await bcrypt.genSalt(12);
                    let hash = await bcrypt.hash(cachedinfo.password, salt);
                    user.password = hash;
                } else {
                    console.log("[\x1b[33mPVC Mapper\x1b[0m] Failed password change attempt for " + user.username)
                }
            } else {
                return res.json({ error: "Type invalid" });
            }
            user.save()
            return res.json({ status: "success" })
        } else {
            return res.json({ error: "Session expired" })
        }
    } else {
        return res.json({ error: "Session invalid" })
    }
});

// Reset session token to log everyone out. 
app.get("/api/v1/logouteverywhere", GETlimiter, async (req, res) => {
    let body = req.body;
    let user = await User.findOne({
        where: {
            uuid: body.uuid
        }
    });
    if ((body.session == user.sessionToken) && (sessionExpiration)) {
        user.sessionToken = generatesessiontoken(32);
        user.sessionExpiration = addMonths(new Date(), 1);
        return res.json({ status: "success" })
    } else {
        return res.json({ error: "Invalid session." })
    }
})

// Get a user's profile.
app.get("/api/v1/profile/:uuid", GETlimiter, async (req, res) => {
    let user = await User.findOne({
        where: {
            uuid: req.params.uuid
        },
        attribute: ["uuid", "username", "profileStyle", "profilePose", "discord", "wiki", "timezone", "creation", "union"]
    });
    if (!user) return res.json({ error: "User does not exist. Try /api/v1/player/:uuid for non-account-holders' player data.", code: 404 });
    res.json({ uuid: user.uuid, username: user.username, profileStyle: user.profileStyle, profilePose: user.profilePose, discord: user.discord, wiki: user.wikiUsername, timezone: user.timezone, creation: user.createdAt });
})

// Get a list of users based on a search
app.get("/api/v1/search/users/:search", SEARCHLimiter, async (req, res) => {
    let players = await Player.findAll({
        where: {
            username: {
                [Op.substring]: req.params.search
            }
        },
        attributes: ["username", "uuid"]
    })
    res.json(players)
})

// Get a user's name
app.get("/api/v1/nameFromUUID/:uuid", GETlimiter, async (req, res) => {
    let user = await User.findOne({
        where: {
            uuid: req.params.uuid
        }
    });
    if (!user) return res.send("Unknown User");
    res.send(user.username)
})

app.get("/api/v1/player/:uuid", GETlimiter, async (req, res) => {
    let player = await Player.findOne({
        where: {
            uuid: req.params.uuid
        }
    })
    if (!player) return res.json({ error: "Player not found", code: 404 });
    return res.json(player)
})

// Profile pictures...
let legacyFetch = require("node-fetch")
app.get("/api/v1/profilepicture/:uuid", async (req, res) => {
    let name = (await User.findOne({
        where: {
            uuid: req.params.uuid
        }
    }))?.username;
    (await legacyFetch(`https://starlightskins.lunareclipse.studio/render/pixel/${name}/face`)).body.pipe(res);
});

app.get("/api/v1/profilepicture/byname/:name", async (req, res) => {
    (await legacyFetch(`https://starlightskins.lunareclipse.studio/render/pixel/${req.params.name}/face`)).body.pipe(res);
})

app.get("/api/v1/profilepicture/:name/:pose/:style", async (req, res) => {
    (await legacyFetch(`https://starlightskins.lunareclipse.studio/render/${req.params.pose}/${req.params.name}/${req.params.style}`)).body.pipe(res);
})
let FileReader = require('filereader'), fileReader = new FileReader();
let validtypes = ["image/png", "image/gif", "image/jpeg"];
function validateImageType(data) {
    return new Promise((resolve, reject) => {
        var arr = data.subarray(0, 4);
        var header = "";
        for (var i = 0; i < arr.length; i++) {
            header += arr[i].toString(16);
        }
        switch (header) {
            case "89504e47":
                resolve(["image/png", true]);
                break;
            case "47494638":
                resolve(["image/gif", true]);
                break;
            case "ffd8ffe0":
            case "ffd8ffe1":
            case "ffd8ffe2":
            case "ffd8ffe3":
            case "ffd8ffe8":
                resolve(["image/jpeg", true]);
                break;
            default:
                resolve(["unknown", false])
                break;
        }
    })
}

app.get("/api/v1/media/:uuid/:id", GETlimiter, async (req, res) => {
    if (!req.params.uuid || !req.params.id) return res.status(400).send("Missing IDs");
    let img = await Image.findOne({
        where: {
            uuid: req.params.uuid,
            id: req.params.id
        }
    });
    if (!img) return res.status(404).send('404 - That image doesn\'t exist. Or at least it doesn\' exist here, anyway... ¯\\_(ツ)_/¯')
    res.header("Content-Type", img.dataType)
    res.status(200).send(img.data)
})


app.get("/api/v1/fetch/portals/:x1/:x2/:z1/:z2", GETlimiter, async (req, res) => {
    let p = await SmallPlace.findAll({
        where: {
            x: {
                [Op.between]: [Number(req.params.x1), Number(req.params.x2)],
            },
            z: {
                [Op.between]: [Number(req.params.z1), Number(req.params.z2)],
            },
        },
        limit: 50
    });
    res.json(p);
})

app.get("/api/v1/fetch/places/:dim/:x1/:x2/:z1/:z2", GETlimiter, async (req, res) => {
    let p = await Place.findAll({
        where: {
            x: {
                [Op.between]: [Number(req.params.x1), Number(req.params.x2)],
            },
            z: {
                [Op.between]: [Number(req.params.z1), Number(req.params.z2)],
            },
            dimension: req.params.dim
        },
        order: [
            ["hits", "DESC"]
        ],
        limit: 25
    });
    res.json(p);
});

app.get("/api/v1/fetch/places/mostPopular", GETlimiter, async (req, res) => {
    let p = await Place.findAll({
        order: [
            ["hits", "DESC"]
        ],
        limit: 25
    });
    res.json(p);
});

app.get("/api/v1/fetch/areas/:dim/:x1/:x2/:z1/:z2", GETlimiter, async (req, res) => {
    let p = await Area.findAll({
        where: {
            x: {
                [Op.between]: [Number(req.params.x1), Number(req.params.x2)],
            },
            z: {
                [Op.between]: [Number(req.params.z1), Number(req.params.z2)],
            },
            dimension: req.params.dim
        },
        order: [
            ["size", "DESC"]
        ],
        limit: 10
    });
    res.json(p);
});

app.get("/api/v1/fetch/area/byid/:id", GETlimiter, async (req, res) => {
    let p = await Area.findOne({
        where: {
            id: req.params.id
        }
    });
    res.json(p)
})

app.get("/api/v1/fetch/places/:search", SEARCHLimiter, async (req, res) => {
    if(!req.params.search) return;
    let p = await Place.findAll({
        where: {
            name: {
                [Op.substring]: req.params.search
            }
        },
        order: [
            ["hits", "DESC"]
        ],
        attributes: ["name", "x", "z", "type", "id"],
        limit: 3
    });
    res.json(p);
})

app.get("/api/v1/fetch/areas/:search", SEARCHLimiter, async (req, res) => {
    if(!req.params.search) return;
    let p = await Area.findAll({
        where: {
            name: {
                [Op.substring]: req.params.search
            }
        },
        attributes: ["name", "x", "z", "type", "id"],
        limit: 3
    });
    res.json(p);
})

app.get("/api/v1/fetch/places/byid/:search", GETlimiter, async (req, res) => {
    if(!req.params.search) return res.json({error: "No ID provided."});
    let p = await Place.findOne({
        where: {
            id: req.params.search
        }
    });
    if(!p) return res.json({error: "Place not found"})
    res.json(p);
    // Increment hits by 1
    p.hits += 1;
    p.save();
})

let shops;
async function getShops() {
    try {
        shops = (await (await fetch("https://web.peacefulvanilla.club/shops/data.json")).json())
    } catch(e) {
        console.log("Failed to fetch shops!!")
        console.error(e);
    }

}
getShops();

let schedule = require("node-schedule");
schedule.scheduleJob('0 0 * * *', () => {
    getShops();
})
function coordswithin(toCheck, minCoords, maxCoords) {
    if (minCoords[0] <= toCheck[0] <= maxCoords[0]) {
        if (minCoords[1] <= toCheck[1] <= maxCoords[1]) {
            return true;
        }
    }
    return false;
}

// This really shows my laziness
// https://www.programming-idioms.org/idiom/178/check-if-point-is-inside-rectangle/2568/js
const pointInRect = ({ x1, z1, x2, z2 }, { x, z }) => {
    return (x >= x1) && (x2 >= x) && (z >= z1) && (z2 >= z);
}

function isPointInRectangle(rectMin, rectMax, point) {
    // Destructure the coordinates for clarity
    const { x: minX, y: minY } = rectMin;
    const { x: maxX, y: maxY } = rectMax;
    const { x: px, y: py } = point;

    // Check if the point is within the rectangle
    return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

// Find shops on the map
app.get("/api/v1/fetch/shops/:x1/:x2/:z1/:z2", GETlimiter, (req, res) => {
    let list = []
    for (const i of shops.data) {
        let coords = i.location.split(",")
        let shopcoords = { x: Number(coords[2]), z: Number(coords[0]) };
        let boundcoords = { x1: Number(req.params.x1), z1: Number(req.params.z1), x2: Number(req.params.x2), z2: Number(req.params.z2) }
        if (isPointInRectangle({x: boundcoords.x1, y: boundcoords.z1 }, {x: boundcoords.x2, y: boundcoords.z2}, {x: shopcoords.x, y: shopcoords.z})) {
            list.push(i)
        }

        if (shops.data.indexOf(i) == shops.data.length - 1) {
            res.json(list);
        }
    }
})

// This list should change so rarely that we should only need to request once.
let itemlist = [];
async function fetchItemList() {
    itemlist = await (await fetch("https://api.pvc-utils.xyz/listItems")).json();
}
fetchItemList();
app.get("/api/v1/search/items/:query", GETlimiter, (req, res) => {
    res.send(itemlist.filter((value) => value.toLowerCase().replace(/_/gm, " ").includes(req.params.query.toLowerCase()) ) ?? []);
})

// Reviews of a place on the map
app.get("/api/v1/fetch/reviews/byplace/:placeid", GETlimiter, async (req, res) => {
    let r = await Review.findAll({
        where: {
            relatedPlace: req.params.placeid
        },
        order: [
            ["createdAt", "DESC"]
        ]
    });
    if(!r) return res.json([]); 
    res.json(r)
})

const fs = require("fs").promises;
let imagelist;
// Often lots of requests are needed for this, so will ignore and hope nobody notices ;)
app.get("/api/v1/fetch/image/:itemid", async (req, res) => {
    if(!imagelist) imagelist = await fs.readdir(require("path").join(__dirname, "/public/assets/images/textures"))
    res.sendFile(require("path").join(__dirname, "/public/assets/images/textures/", imagelist.filter((value) => value.toLowerCase().includes(req.params.itemid.toLowerCase())).sort((a, b) => a.length - b.length)[0] ?? "UnknownItem.png"))
})

// These should be ratelimited to about once every min, except for the images which should be limited on their own (to about once every 5 mins) 
const POSTlimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 3, // Limit each IP to 1 request per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "You've just been rate limited. You can add things at a grand speed of 3 places per minute."
})
const POSTImageLimiter = rateLimit({
	windowMs: 3 * 60 * 1000, // 3 minutes
	limit: 1, // Limit each IP to 1 request per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "You've just been rate limited. You can add an image once every 3 minutes. *SPEED*"
})

app.post("/api/v1/delete/:id", POSTlimiter, jsonParser, async (req, res) => {
    if(!req.body.uuid || !req.body.session) return res.json({status: "NotOK", error: "Missing data! :O"});
    if(!verifyAuthentication({uuid: req.body.uuid, session: req.body.session})) return res.json({status: "NotOK", error:"Failed authentication. Try logging in again?"});
    if(req.params.id.toLowerCase().startsWith("a")) {
        let area = await Area.findOne({
            where: {
                id: req.params.id.substring(1)
            }
        })
        if(area.addedBy.uuid == req.body.uuid) {
            area.destroy();
            res.json({status: "OK", message: "Place has been deleted!"})
        } else {
            let dataToDiscord = {
                "content": null,
                "embeds": [
                  {
                    "title": "Delete Request (Area)",
                    "description": `Name: ${area.name}\nID: A${area.id}\nDescription: ${area.description}\n\nRequested by: ${req.body.uuid}`,
                    "color": 5814783
                  }
                ],
                "attachments": []
              }
            await fetch(discordWebhookURL, {
                method: "POST",
                body: JSON.stringify(dataToDiscord),
                headers: {"Content-Type": "application/json"}
            });
            res.json({status: "OK", message: "Request to delete has been placed!"})
        }
    } else if(req.params.id.toLowerCase().startsWith("p")) {
        let place = await Place.findOne({
            where: {
                id: req.params.id.substring(1)
            }
        })
        if(place.addedBy.uuid == req.body.uuid) {
            place.destroy();
            res.json({status: "OK", message: "Place has been deleted!"})
        } else {
            let dataToDiscord = {
                "content": null,
                "embeds": [
                  {
                    "title": "Delete Request (Place)",
                    "description": `Name: ${place.name}\nID: A${place.id}\nDescription: ${place.description}\n\nRequested by: ${req.body.uuid}`,
                    "color": 5814783
                  }
                ],
                "attachments": []
              }
            await fetch("https://discord.com/api/webhooks/1275803664837120071/Mrnt-gyls91KCCIGahNQJB3tArlftAmLDvY2drC3PbAISO83UsCkpBRKAVk1l65zjVs6", {
                method: "POST",
                body: JSON.stringify(dataToDiscord),
                headers: {"Content-Type": "application/json"}
            });
            res.json({status: "OK", message: "Request to delete has been placed!"})
        }
    } else {
        res.json({status: "NotOK", message: "Invalid ID."})
    }
})

// Handle adding places...
app.post("/api/v1/create/place", POSTlimiter, jsonParser, async (req, res) => {
    if(swearjar.profane(req.body.place.description) || swearjar.profane(req.body.place.name)) return res.json({status: "NotOK", error: "Detected some bad language. Please make your place submission squeaky clean ✨"});
    if (!(await verifyAuthentication({ session: req.body.sessionToken, uuid: req.body.uuid }))) return res.json({ status: "NotOK", error: "Invalid session. Sign in again?" })
    let data = req.body.place;
    let username = (await User.findOne({ where: { uuid: req.body.uuid } })).username;
    data.addedBy = {
        uuid: req.body.uuid,
        name: username
    };

    try {
        await Place.create(data);
        res.json({ status: "OK", content: "Place added! Yay!" })
    } catch (e) {
        console.error(e)
        res.json({ status: "NotOK", error: "Error while adding to database. Contact Larry, since this is prob bad 😓" })
    }
})

// Handle editing places...
app.post("/api/v1/edit/place/:id", POSTlimiter, jsonParser, async (req, res) => {
    if(swearjar.profane(req.body.place.description) || swearjar.profane(req.body.place.name)) return res.json({status: "NotOK", error: "Detected some bad language. Please make your place submission squeaky clean ✨"});
    if (!(await verifyAuthentication({ session: req.body.sessionToken, uuid: req.body.uuid }))) return res.json({ status: "NotOK", error: "Invalid session. Sign in again?" })
    let data = req.body.place;
    let place = await Place.findOne({where: {id: req.params.id}});
    if(req.body.place.images) {
        // Remove the old image...
        Image.destroy({
            where: {
                id: place.images.split("/")[4]
            }
        })
    }
    let username = (await User.findOne({ where: { uuid: req.body.uuid } })).username;
    place.name = data.name;
    place.x = data.x;
    place.z = data.z;
    place.wiki = data.wiki;
    place.createdBy = data.createdBy;
    place.dateCreated = data.dateCreated;
    place.description = data.description;
    if(data.images) place.images = data.images;
    place.type = data.type;
    place.features = data.features;
    place.edits.push({
        name: username,
        date: new Date().toISOString()
    });
    place.changed('edits', true);
    place.save()
    res.json({status: "OK"})
})


app.post("/api/v1/create/review/:placeid", POSTlimiter, jsonParser, async (req, res) => {
    if(!req.body.uuid || !req.body.name || !req.body.content || !req.params.placeid) return res.json({error: "We're missing some data. Make sure you're signed into the PVC Mapper and try again!"})
    if(swearjar.profane(req.body.content)) return res.json({error: "Bad language detected. Please make your review squeaky clean :)"})
    if(await verifyAuthentication({session: req.body.session, uuid: req.body.uuid})) {
        await Review.create({
            postedBy: {
                uuid: req.body.uuid,
                name: req.body.name,
            },
            postedOn: new Date(),
            content: req.body.content,
            relatedPlace: req.params.placeid
        })
        res.json({status: "OK"})
    } else {
        res.json({error: "Invalid session. Try logging in again?"})
    }
    
})

// And smol places for smol things like smol portals
app.post("/api/v1/create/quickadd", POSTlimiter, jsonParser, async (req, res) => {
    if(swearjar.profane(req.body.name)) return res.json({status: "NotOK", error: "Detected some bad language. Please make your place submission squeaky clean ✨"});
    if(await verifyAuthentication({uuid: req.body.uuid, session: req.body.session})) {
        SmallPlace.create({
            type: req.body.type,
            name: req.body.name,
            x: req.body.x,
            z: req.body.z,
            dimension: req.body.dimension,
            addedBy: req.body.uuid
        });
        return res.json({status: "OK"})
    } else {
        return res.json({status: "NotOK", error: "Verification failed. Maybe try logging in again?"})
    }
})

app.post("/api/v1/create/area", POSTlimiter, jsonParser, async (req, res) => {
    
    if(swearjar.profane(req.body.area.description) || swearjar.profane(req.body.area.name)) return res.json({status: "NotOK", error: "Detected some bad language. Please make your area submission squeaky clean ✨"});
    if(await verifyAuthentication({session: req.body.sessionToken, uuid: req.body.uuid})) {
        let username = (await User.findOne({ where: { uuid: req.body.uuid } })).username;
        await Area.create({
            name: req.body.area.name,
            description: req.body.area.description,
            wiki: req.body.area.wiki,
            type: req.body.area.type,
            dimension: req.body.area.dimension,
            image: req.body.area.image,
            bounds: req.body.area.bounds,
            addedBy: {
                username: username,
                uuid: req.body.uuid
            },
            size: req.body.area.size,
            x: req.body.area.x,
            z: req.body.area.z
        })
        res.json({status: "OK"})
    } else {
        res.json({status: "NotOK", error: "Invalid session. Try logging in again?"})
    }
})

app.post("/api/v1/edit/area/:id", POSTlimiter, jsonParser, async (req, res) => {
    if(!req.body.name || !req.body.description || !req.body.bounds) return res.json({status: "NotOK", error: "Missing some data! :O"})
    if(swearjar.profane(req.body.description) || swearjar.profane(req.body.name)) return res.json({status: "NotOK", error: "Detected some bad language. Please make your area submission squeaky clean ✨"});
    if(await verifyAuthentication({session: req.body.sessionToken, uuid: req.body.uuid})) {
        let area = await Area.findOne({where: {id: req.params.id}});
        if(!area) return res.json({status: "NotOK", error: "We couldn't find that area. :("})
        if(req.body.image) {
            // Remove the old image...
            Image.destroy({
                where: {
                    id: area.image.split("/")[4]
                }
            })
        }
        let editor = (await User.findOne({ where: { uuid: req.body.uuid } })).username;
        area.name = req.body.name;
        area.description = req.body.description;
        area.wiki = req.body.wiki;
        if(req.body.image) area.image = req.body.image; // Only should be there if it needs to change
        area.bounds = req.body.bounds;
        area.size = req.body.size;
        area.x = req.body.x;
        area.z = req.body.z;
        area.edits.push({
            name: editor,
            date: new Date().toISOString()
        })
        area.changed('edits', true);
        area.save();

    
        res.json({status: "OK"})
    } else {
        res.json({status: "NotOK", error: "Invalid session. Try logging in again?"})
    }
})

app.post("/api/v1/create/mediaupload/:uuid", POSTImageLimiter, bodyParser.raw({type: "image/*", limit: "7mb", inflate: true}), async (req, res) => {
    if (!req.body || !req.headers.authorization || !req.headers["content-type"] || !req.params.uuid) return res.status(400).send("Missing headers or content")
    // Body is image source
    // Authentication header is session token
    // UUID is req.params.uuid
    // Datatype is content-type header 

    // Check authorization
    if (!verifyAuthentication({ uuid: req.params.uuid, session: req.headers.authorization })) return res.status(401).send("Couldn't log in. Try logging in again?")

    // All is good. Proceed with the upload.
    let img = await Image.create({
        data: req.body,
        dataType: req.headers["content-type"],
        uuid: req.params.uuid
    });
    res.status(200).json({ url: `/api/v1/media/${req.params.uuid}/${img.id}` })
})

app.use((req, res) => {
    res.status(404).send('404 - Looks like you got the wrong page ¯\\_(ツ)_/¯')
})

// Listen to HTTP on port 3005
app.listen(3005)
console.log("[\x1b[33mPVC Mapper\x1b[0m] Congratulations, the monstrosity of code AKA the PVC Mapper is now running on port 3005. \nHow did you manage that?! - http://localhost:3005")