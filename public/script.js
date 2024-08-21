// Util functions to convert between map coords and block coords
function getScale() {
    return 1 / Math.pow(2, 8);
}

function pixelsToMeters(num) {
    return num * getScale();
}

function metersToPixels(num) {
    return Math.round(num / getScale());
}

function metersToPixelsLatLng(num) {
    return [Math.round(num.lng / getScale()), Math.round(num.lat / getScale())];
}

// Convert IDs to pretty text <3
let convertIDToPretty = (id) => {
    switch (id) {
        case "minecraft_the_nether":
            return "Nether"
            break;
        case "minecraft_overworld":
            return "Overworld"
            break;

        default:
            return;
            break;
    }
}

if (!localStorage.getItem("noWelcomeMenu")) {
    localStorage.setItem("noWelcomeMenu", true)
    new bootstrap.Modal("#welcomeModal").show()
}


function romanize(num) {
    if (isNaN(num))
        return NaN;
    var digits = String(+num).split(""),
        key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
            "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
            "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}

// Create function to convert to Title Case
let toTitleCase = (s) => s.replace(/(\w)(\w*)/g,
    function (g0, g1, g2) { return g1.toUpperCase() + g2.toLowerCase(); });

// Generates markers for places...
function generateMarker(name, lat, lng, type, id) {
    let url;
    switch (type) {
        case "farm":
        case "landmark":
        case "museum":
        case "lighthouse":
            url = "map-pin-yellow.svg"
            break;
        case "shop":
        case "mall":
            url = "map-pin-orange.svg"
            break;
        case "union":
        case "base":
        case "town":
            url = "map-pin-blue.svg"
            break;
        case "event":
        case "pvp":
            url = "map-pin-purple.svg"
            break;
        default:
            url = "map-pin.svg"
            break;
    }
    return L.marker(L.latLng(lat, lng), {
        icon: L.divIcon({
            html: `<a class="mapmarkerplace" onclick="openPlaceOffcanvas('${id}')"><img style="display: inline-block;" src="./assets/images/${url ?? "map-pin.svg"}" height="30" width="20"> <span class="stroketext">${name}</span></a>`,
            className: "mapmarkerplace",

            iconAnchor: L.point(10, 30),
            iconSize: L.point(200, 48)
        }),
        zIndexOffset: 4
    })
}

// The list of players will be kept globally. We update this every so often.
var players = [],
    map,
    trackingnow; // See who we're tracking now.

document.getElementById("closetracker").addEventListener("click", () => {
    map.dragging.enable()
    trackingnow = null;
    document.getElementById("trackerPanel").style.display = "none";
})

// Activate all toasts in the page
const toastElList = document.querySelectorAll('.toast')
const toastList = [...toastElList].map(toastEl => new bootstrap.Toast(toastEl))

// Expand searchbar when clicked
document.querySelector(".searchbarinput").addEventListener("click", () => {
    document.querySelector(".searchbar").classList.remove("notactive")
})
// And collapse when they've clicked anywhere else.
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("searchbarinput")) {
        document.querySelector(".searchbar").classList.add("notactive")
    }
})

let defaultsearchinstructions = `<strong>Try searching for:</strong>
            <ul>
                <li><code>Spawn</code> - Search for any place</li>
                <li><code>User:.LarryTLlama</code> - Search for their profile</li>
                <li><code>Item:Dirt</code> - Search for shops selling this item</li>
                <li><code>Shop:-173, 7273</code> - Search for a shop at this location</li>
                <li><code>Coords:1928,-173</code> - Go to coordinates on the map</li>
            </ul>`

var quickAddCoords, quickAddType, switchDimension;
let nom;
var updateProfileCredential;
// Determines what dimension we're in
let currentDimension = "minecraft_overworld";
let recentCoords;
// All of our main content is run asynchronously, so uses the async go function.
let go = async () => {
    document.getElementById('dimensionToggleSwitch').checked = false;
    let greetings = ["Hey there", "Howdy", "Hiya", "Heyyyy", "Ello", "Yo", "G'day", "Greetings"]
    if (localStorage.getItem("localuuid")) {
        document.querySelector("#localProfilePicture").src = "/api/v1/profilepicture/" + localStorage.getItem("localuuid");
        let nomres = await fetch("/api/v1/nameFromUUID/" + localStorage.getItem("localuuid"));
        nom = await nomres.text()
        document.getElementById("menuGreeting").innerHTML = `${greetings[Math.floor(Math.random() * greetings.length)]}, ${nom}! <a href="/logout">Log Out?</a>`;
    } else {
        document.getElementById("menuGreeting").innerHTML = `${greetings[Math.floor(Math.random() * greetings.length)]}! <a href="/signup"><button class="btn btn-sm btn-primary">Sign Up</button></a><a href="/login"><button class="btn btn-sm btn-primary">Log In</button></a>`
    }
    // First, we fetch to see if there's an update.
    let updateCheckerFetch = await fetch("./versionControl.json")
    let updateChecker = await updateCheckerFetch.json()
    // If we've never visited before, keep them up-to-date
    if (localStorage.getItem("latestVersion") == null) localStorage.setItem("latestVersion", updateChecker[0].version);
    // If it's not up to date, and we've got old data
    if (updateChecker[0].version != localStorage.getItem("latestVersion")) {
        // We need to update. A simple refresh will do the trick.
        // We can also add the update stuff to make it work ✨

        // Set the new version number to prevent a loop
        localStorage.setItem("latestVersion", updateChecker[0].version)
        window.location.search = "?update=true"
    }

    // Check to see if we have just updated.
    if (window.location.search.includes("update=true")) {
        document.querySelector("#releaseNo").innerHTML = updateChecker[0].version;
        document.querySelector("#releaseDate").innerHTML = updateChecker[0].date;
        document.querySelector("#releaseNotes").innerHTML = updateChecker[0].notes;
        new bootstrap.Toast(document.querySelector("#updateToast")).show();
        window.history.pushState({}, "PVC Mapper - Everything's right here!", window.location.href.split("?")[0]);
    }

    function dont() { }
    // Here's where the fun begins!
    // Initialise the map.
    map = L.map(document.querySelector("#map"), {
        center: [0, 0],
        zoom: 5,
        crs: L.Util.extend(L.CRS.Simple, {
            // we need to flip the y-axis correctly
            // https://stackoverflow.com/a/62320569/3530727
            transformation: new L.Transformation(1, 0, 1, 0)
        }),
        zoomSnap: window.matchMedia("(pointer: coarse)").matches ? 0 : 0.5,
        zoomDelta: 0.5,
        rotate: true,
        rotateControl: {
            closeOnZeroBearing: true,
        },
        shiftKeyRotate: true,
        touchRotate: false,
        // Context (right click) menu
        contextmenu: true,
        contextmenuWidth: 200,
        contextmenuItems: [
            {
                text: 'Quick Add here',
                callback: openQuickAdd
            }, '-', {
                text: 'Copy coordinates',
                callback: copyCoords
            }, {
                text: 'Copy coordinates with dimension',
                callback: copyCoordsDimension
            }, {
                text: 'Copy mapper link to here',
                callback: copyMapperLink
            }, '-', {
                text: 'Centre map here',
                callback: centreMap
            }, {
                text: 'Centre and zoom in here',
                callback: centreAndZoom
            }]

    });
    map.attributionControl.addAttribution('Tiles taken from <a href="https://web.peacefulvanilla.club/maps">Peaceful Vanilla Club Dynmap</a> | <a href="/help#disclaimer">Other Data Providers</a>');
    map.on("contextmenu", (e) => {
        recentCoords = e.latlng;
        let recCoords = metersToPixelsLatLng(e.latlng)
        document.getElementById("quickAddX").value = recCoords[0]
        document.getElementById("quickAddZ").value = recCoords[1]
        map.contextmenu.showAt(recentCoords)
    })

    function copyCoords(e) {
        navigator.clipboard.writeText(`${metersToPixels(recentCoords.lng)}, ${metersToPixels(recentCoords.lat)}`)
    }
    function copyCoordsDimension(e) {
        navigator.clipboard.writeText(`${metersToPixels(recentCoords.lng)}, ${metersToPixels(recentCoords.lat)} in ${convertIDToPretty(currentDimension)}`)
    }
    function copyMapperLink(e) {
        let host = new URL(window.location.href);
        navigator.clipboard.writeText(`${host.protocol}//${host.hostname}/?x=${metersToPixels(recentCoords.lng)}&z=${metersToPixels(recentCoords.lat)}&dimension=${currentDimension}`)
    }
    function centreMap(e) {
        map.panTo(recentCoords)
    }
    function centreAndZoom(e) {
        map.setView(recentCoords, 8)
    }



    // Create our tilemap layers
    // One for the overworld
    const Overworld = L.TileLayer.extend({
        getTileUrl(coords) {
            return window.location.protocol + "//" + window.location.host + `/maps/minecraft_overworld/${coords.z}/${coords.x}_${coords.y}.png`;
        },
        options: {
            noWrap: true,
            bounds: [[-1000, -1000], [1000, 1000]],
            minZoom: 0,
            maxZoom: 8,
            tileSize: 512
        },
    });

    // And one for the nether
    const Nether = L.TileLayer.extend({
        getTileUrl(coords) {
            return window.location.protocol + "//" + window.location.host + `/maps/minecraft_the_nether/${coords.z}/${coords.x}_${coords.y}.png`;
        },
        options: {
            noWrap: true,
            bounds: [[-1000, -1000], [1000, 1000]],
            minZoom: 0,
            maxZoom: 8,
            tileSize: 512
        },
    });

    // Here's our freshly baked tile layers
    let ow = new Overworld();
    // Add the overworld one to the map
    ow.addTo(map);
    // Nether one is made, but not added (yet)
    let nt = new Nether();

    // Create our people layer
    let playersGroup = L.layerGroup([], {

    }).addTo(map);

    let markerGroup = L.layerGroup([]).addTo(map);

    let areaGroup = L.layerGroup([]).addTo(map);

    let portalGroup = L.layerGroup([]).addTo(map);

    let shopsGroup = L.markerClusterGroup({
        spiderfyOnMaxZoom: false,
        zoomToBoundsOnClick: false,
        iconCreateFunction: function (cluster) {
            return L.icon({
                iconUrl: "/assets/images/villagerGroup.png",
                iconSize: L.point(32, 32)
            });
        },
    }).addTo(map);

    shopsGroup.on("clusterclick", (eve) => {
        closePlaceOffcanvas()
        console.log(map.getZoom())
        let selectedShops = eve.layer.getAllChildMarkers()
        let numOfShops = selectedShops.length;
        document.getElementById("searchBarCloseBtn").classList.remove("hidden");
        document.getElementById("tradeSearchQuery").innerText = `Trades around ${metersToPixels(eve.latlng.lng)}, ${metersToPixels(eve.latlng.lat)}`

        let text = "";
        selectedShops.forEach((child) => {
            if (!text.includes(child._popup._content.split("ENDOFHIDDENCONTENT")[0].split("STARTOFHIDDENCONTENT")[1])) {
                text += child._popup._content.split("ENDOFHIDDENCONTENT")[0].split("STARTOFHIDDENCONTENT")[1]
                text += `<hr style="margin-top: 5px; margin-bottom: 5px;" />`
            } else {
                numOfShops -= 1
            }
        })
        document.getElementById("numberOfTrades").innerText = numOfShops;
        document.getElementById("tradesList").innerHTML = text;
        shopsOffcanvas.show();
        /*
        console.log(eve)
        console.log(eve.layer.getConvexHull())
        let bound = eve.layer.getBounds()
        let a = metersToPixelsLatLng(bound.getNorthWest());
        let b = metersToPixelsLatLng(bound.getSouthEast());
        let maxx = Math.max(...[a[1], b[1]]),
            maxz = Math.max(...[a[0], b[0]]);
        console.log(metersToPixels(eve.latlng.lng), metersToPixels(eve.latlng.lat), maxx - metersToPixels(eve.latlng.lng))
        if(Math.max(maxx, maxz) == maxx) {
            shopsByLocation(eve.latlng.lng, eve.latlng.lat, maxx - eve.latlng.lng)
        } else {
            shopsByLocation(eve.latlng.lng, eve.latlng.lat, maxz - eve.latlng.lat)
        }*/
    })

    // Get shop world IDs, because they're *different*
    function getShopWorldID(id) {
        switch (id) {
            case "minecraft_overworld":
                return "World"
            case "minecraft_the_nether":
                return "World_nether"
            default:
                return;
        }
    }



    // Add to the map.
    let addedUUIDs = {};
    let prevDimension = {};

    let shopCache = {};
    // When the map has been moved...
    let refreshShops = async () => {
        let bound = map.getBounds();
        let a = metersToPixelsLatLng(bound.getNorthWest());
        let b = metersToPixelsLatLng(bound.getSouthEast());
        let minx = Math.min(...[a[1], b[1]]),
            minz = Math.min(...[a[0], b[0]]),
            maxx = Math.max(...[a[1], b[1]]),
            maxz = Math.max(...[a[0], b[0]]);
        // Show shops at a certain zoom level (6)...
        if (map.getZoom() >= 6.5) {
            // Find shops
            // Check the old ones to see if we need them
            // Remove them if not
            let shops = await (await fetch(`/api/v1/fetch/shops/${minx}/${maxx}/${minz}/${maxz}`)).json()
            console.log(shops)
            const pointInRect = ({ x1, z1, x2, z2 }, { x, z }) => (
                (x > x1 && x < x2) && (z > z1 && z < z2)
            )
            for (const i of Object.keys(shopCache)) {
                if (!bound.contains(L.latLng(pixelsToMeters(Number(i.split(",")[2])), pixelsToMeters(Number(i.split(",")[0]))))) {
                    shopCache[i].remove()
                    delete (shopCache[i])
                }
            }
            shops.forEach((shop) => {
                console.log("NEW SHOP SET")
                console.log(shopCache[shop.location.replace(/ /gm, "")])
                if (shopCache[shop.location.replace(/ /gm, "")] == undefined && getShopWorldID(currentDimension) == shop.world) {
                    console.log(L.latLng(pixelsToMeters(shop.location.split(",")[2]), pixelsToMeters(shop.location.split(",")[0])))
                    shopCache[shop.location.replace(/ /gm, "")] = L.marker(L.latLng(pixelsToMeters(shop.location.split(",")[2]), pixelsToMeters(shop.location.split(",")[0])), {
                        icon: L.icon({
                            iconUrl: "/assets/images/villager.png",
                            iconSize: L.point(32, 32)
                        }),
                        zIndexOffset: 3
                    }).bindPopup(`<span class="markerContent hidden">STARTOFHIDDENCONTENT
                        <strong>${shop.shopName.length == 0 ? "Shop" : shop.shopName} by ${shop.shopOwner}</strong><br>
                        <small>Selling</small> ${shop.recipes.map(({ resultItem }) => resultItem.name.length == 0 ? toTitleCase(resultItem.type).replace(/_/gm, " ") : resultItem.name).splice(0, 2).join(", ")} ${shop.recipes.length > 2 ? "and more..." : ""}<br>
                        <button class="btn btn-primary"  style="--bs-btn-padding-y: .1rem; --bs-btn-padding-x: .2rem; --bs-btn-font-size: .75rem;" onclick="shopsByLocation(${pixelsToMeters(shop.location.split(",")[0])}, ${pixelsToMeters(shop.location.split(",")[2])})">See all trades from this vendor</button>ENDOFHIDDENCONTENT</span><strong>${shop.shopName.length == 0 ? "Shop" : shop.shopName} by ${shop.shopOwner}</strong><br><br><small>Selling...</small><br> ${shop.recipes.map(({ resultItem }) => resultItem.name.length == 0 ? toTitleCase(resultItem.type).replace(/_/gm, " ") : resultItem.name).splice(0, 3).join(", ")} ${shop.recipes.length > 3 ? "<br>And " + (shop.recipes.length - 3) + " other trades..." : ""}<br><button class="btn btn-primary"  style="--bs-btn-padding-y: .1rem; --bs-btn-padding-x: .2rem; --bs-btn-font-size: .75rem;" onclick="shopsByLocation(${pixelsToMeters(shop.location.split(",")[0])}, ${pixelsToMeters(shop.location.split(",")[2])})">View All Trades...</button>`).addTo(shopsGroup)
                }
            }
            )
        } else {
            shopsGroup.clearLayers();
            if (shopCache != {}) {
                // Remove them all if we've zoomed out too much.
                for (const i of Object.keys(shopCache)) {
                    shopCache[i].remove()
                    delete (shopCache[i])

                }
            }
        }
    }
    map.on("moveend", refreshShops)

    async function refreshPlaces() {
        let bound = map.getBounds();
        let a = metersToPixelsLatLng(bound.getNorthWest());
        let b = metersToPixelsLatLng(bound.getSouthEast());
        let minx = Math.min(...[a[1], b[1]]),
            minz = Math.min(...[a[0], b[0]]),
            maxx = Math.max(...[a[1], b[1]]),
            maxz = Math.max(...[a[0], b[0]]);
        // Fetch places. The server will determine zoom levels and stuff...

        let places = await (await fetch(`/api/v1/fetch/places/${currentDimension}/${minz}/${maxz}/${minx}/${maxx}`)).json();
        if (markerGroup) markerGroup.clearLayers();
        places.forEach((place) => {
            generateMarker(place.name, pixelsToMeters(place.z), pixelsToMeters(place.x), place.type, place.id).addTo(markerGroup);
        })

        let areas = await (await fetch(`/api/v1/fetch/areas/${currentDimension}/${pixelsToMeters(minz)}/${pixelsToMeters(maxz)}/${pixelsToMeters(minx)}/${pixelsToMeters(maxx)}`)).json();
        if (areaGroup) areaGroup.clearLayers();
        areas.forEach((area) => {
            L.marker(L.latLng(area.z, area.x), {
                icon: L.divIcon({
                    html: `<strong class="stroketext" onclick="openAreaOffcanvas('${area.id}')">${area.name}</strong>`,
                    className: "areaMarker",
                    iconAnchor: L.point(50, 5)
                }),
                zIndexOffset: 15
            }).addTo(areaGroup)
        })

        if (map.getZoom() > 7.5) {
            let portals = await (await fetch(`/api/v1/fetch/portals/${minz}/${maxz}/${minx}/${maxx}`)).json();
            if (portalGroup) portalGroup.clearLayers();
            portals.forEach((portal) => {
                if (portal.dimension == currentDimension) {
                    L.marker(L.latLng(pixelsToMeters(portal.z), pixelsToMeters(portal.x)), {
                        icon: L.icon({
                            iconUrl: portal.type == "portal" ? "./assets/images/NetherPortal.png" : (portal.type == "echest" ? "./assets/images/enderChest.png" : "./assets/images/PortalEnderChest.png"),
                            iconSize: L.point(24, 24),
                            iconAnchor: L.point(12, 12)
                        }),
                        zIndexOffset: 1
                    }).bindPopup(`"${portal.name}"<br>${portal.type == "portal" ? "Nether Portal" : (portal.type == "echest" ? "Ender Chest" : "Nether Portal with Ender Chest")}<br>${portal.x}, ${portal.z} in ${convertIDToPretty(portal.dimension)}`)
                        .addTo(portalGroup)
                }
            })
        } else {
            portalGroup.clearLayers();
        }
    }
    refreshPlaces()
    map.on("moveend", refreshPlaces)

    map.on("rotate", (ev) => {
        for (const e of document.querySelectorAll(".playerMarkerArrow")) {
            //e.setAttribute("style",)
        }
        console.log()
    })


    let getMapCoords = (x, z, dimension) => {
        if (dimension == "minecraft_the_nether" && currentDimension == "minecraft_overworld") {
            return L.latLng(pixelsToMeters(z * 8), pixelsToMeters(x * 8))
        } else
            if (dimension == "minecraft_overworld" && currentDimension == "minecraft_the_nether") {
                return L.latLng(pixelsToMeters(z / 8), pixelsToMeters(x / 8))
            } else {
                return L.latLng(pixelsToMeters(z), pixelsToMeters(x))
            }
    }

    let refreshPlayers = async () => {
        // Fetch the player list
        let list = await (await fetch("/api/v1/players")).json()
        if (trackingnow) {
            let pl = list.find((e) => e.uuid == trackingnow);
            if (!pl) {
                // Close the tracker.
                map.dragging.enable()
                trackingnow = null;
                document.getElementById("trackerPanel").style.display = "none";

            }
            document.getElementById("trackerName").innerText = pl.name;
            document.getElementById("trackerDetails").innerText = `Coordinates: ${pl.x}, ${pl.z}
            Dimension: ${convertIDToPretty(pl.world)}
            Armour: ${pl.armor / 2}/10
            Health: ${pl.health / 2}/10`
            map.panTo(getMapCoords(pl.x, pl.z, pl.world))
        }
        players = list;
        document.getElementById("numberOfPlayersOnline").innerText = players.length;
        // Update the map.
        for (const e of players) {
            // If we already have it
            if (addedUUIDs[e.uuid]) {
                // Move the marker...
                addedUUIDs[e.uuid].setLatLng(getMapCoords(e.x, e.z, e.world))
                // Change the rotation...
                document.getElementById(`locationArrow${e.uuid}`).setAttribute("style", `transform: rotate(${(e.yaw - 45) - 180 + map.getBearing()}deg);`)
                document.getElementById(`playerPos${e.uuid}`).innerText = `${e.x},${e.z} ${convertIDToPretty(e.world)}`
                // If player was previously in a different dimension...
                document.getElementById(`mapPic${e.uuid}`).src = `${e.world != currentDimension ? "/assets/images/portal.gif" : "/api/v1/profilePicture/byname/" + e.name}`
                prevDimension[e.uuid] = e.world;
            } else {
                document.getElementById("playerList").innerHTML += `<div id="${e.uuid}" class="playerInList">
                    <img height="100px" src="/api/v1/profilepicture/${e.name}/default/full"/><div style="margin-left: 16px;"><strong>${e.name}</strong><br><small>${e.x}, ${e.z} in the ${convertIDToPretty(e.world)}<br><button class="btn btn-sm btn-primary playerListBtn" onclick="window.loadProfile('${e.uuid}')">View Mapper Profile</button> <button class="btn btn-sm btn-primary playerListBtn">Follow player</button></small><div>
                </div>`
                // Create the new marker...
                addedUUIDs[e.uuid] = L.marker(getMapCoords(e.x, e.z, e.world), {

                    icon: L.divIcon({
                        html: `<img height="16" class="playerMarkerArrow" src="/assets/images/locationarrow.svg" id="locationArrow${e.uuid}" style="transform: rotate(${(e.yaw - 45) - 180 + map.getBearing()}deg);" /> <span class="playerMarkerContent"><img height="32" src="${e.world != currentDimension ? "/assets/images/portal.gif" : "/api/v1/profilePicture/byname/" + e.name}" id="mapPic${e.uuid}" class="mapPic"/> <strong>${e.name}<br><span id="playerPos${e.uuid}">${e.x},${e.z} ${convertIDToPretty(e.world)}</span></strong></span>`,
                        className: `playerMarker marker${e.uuid}`,
                        iconAnchor: L.point(8, 8)
                    }),
                    zIndexOffset: -3
                }).addTo(playersGroup).on("click", () => {
                    /*map.dragging.disable();
                    trackingnow = e.uuid
                    document.getElementById("trackerDetails").innerHTML = "Loading..."
                    document.getElementById("trackerPanel").style.display = "block";*/
                    window.loadProfile(e.uuid)
                });
                prevDimension[e.uuid] = e.world;
            }
        }

        for (const e of Object.keys(addedUUIDs)) {
            if (!players.find((el) => el.uuid == e)) {
                // Player logged out.
                addedUUIDs[e].remove();
                delete (addedUUIDs[e]);
                delete (prevDimension[e]);
                document.getElementById(e)?.remove()
            }
        }
    }

    setInterval(refreshPlayers, 1500)

    // This will contain our other layers (networks/places/people)
    let otherlayers = { "Players": playersGroup, "Shops": shopsGroup, "Places": markerGroup };
    // Add those to the layer control.
    L.control.layers({}, otherlayers, { position: "topleft" }).addTo(map);

    // Function to switch dimensions...
    switchDimension = (dim) => {
        console.log("Switching to " + dim)
        if (dim == "nether") {
            map.removeLayer(ow);
            nt.addTo(map);
            currentDimension = "minecraft_the_nether";
        } else if (dim == "overworld") {
            map.removeLayer(nt);
            ow.addTo(map);
            currentDimension = "minecraft_overworld"
        }
        shopsGroup.clearLayers();
        shopCache = {};
        refreshShops()
        refreshPlaces()
        refreshPlayers()
    }

    // Check for query string.
    // First, split them.
    let query = new URL(location.href).searchParams;
    if (query.get("dimension") == "nether") {
        switchDimension("nether")
    }

    // Set x and z positions
    if (query.get("x") && query.get("z")) {
        map.panTo(L.latLng(pixelsToMeters(Number(query.get("z"))), pixelsToMeters(Number(query.get("x")))));
    }

    // Search results. This searches the whole database! :O

    // Func to generate search result HTML
    function getResultHTML(result, isArea) {
        console.log(isArea)
        let html = `<a onclick="open${isArea ? "Area" : "Place"}Offcanvas('${result.id}')" class="searchResult">
        <span class="resultIcon">`
        console.log(result)
        switch (result.type) {
            case "farm":
                html += `<i class="fa-solid fa-cow"></i>`
                break;
            case "shop":
                html += `<i class="fa-solid fa-basket-shopping"></i>`
                break;
            case "mall":
                html += `<i class="fa-solid fa-shop"></i>`
                break;
            case "museum":
                html += `<i class="fa-solid fa-book-atlas"></i>`
                break;
            case "event":
                html += `<i class="fa-solid fa-puzzle-piece"></i>`
                break;
            case "pvp":
                html += `<i class="fa-solid fa-heart-crack"></i>`
                break;
            case "base":
                html += `<i class="fa-solid fa-house-user"></i>`
                break;
            case "landmark":
                html += `<i class="fa-solid fa-landmark"></i>`
                break;
            case "lighthouse":
                html += `<i class="fa-solid fa-tower-observation"></i>`
                break;
            case "union":
                html += `<i class="fa-solid fa-people-group"></i>`
                break;
            case "mapart":
                html += `<i class="fa-solid fa-images"></i>`
                break;
            case "town":
                html += `<i class="fa-solid fa-tree-city"></i>`
                break;
            case "area":
                html += `<i class="fa-solid fa-landmark"></i>`
                break;
            case "region":
                html += `<i class="fa-solid fa-book-atlas"></i>`
                break;
            case "park":
                html += `<i class="fa-solid fa-tree"></i>`
                break;
            default:
                html += `<i class="fa-solid fa-location-dot"></i>`
                break;
        }
        html += `</span><p class="resultContent"><strong>${result.name}</strong><br><small>Overworld: ${isArea ? metersToPixels(result.x) : result.x}, ${isArea ? metersToPixels(result.z) : result.z}</small></p><span class="resultArrow"><i class="fa-solid fa-circle-chevron-right"></i></span></a>`
        return html;
    }
    let searchbarinput = document.querySelector(".searchbarinput")
    let results = document.querySelector(".searchbarinstructions")
    searchbarinput.addEventListener("keyup", async () => {
        results = document.querySelector(".searchbarinstructions")
        if (searchbarinput.value == "") {
            results.innerHTML = defaultsearchinstructions;
        } else {
            if (searchbarinput.value.toLowerCase().startsWith("coords:") || searchbarinput.value.toLowerCase().startsWith("coords :")) {
                if (searchbarinput.value.split(":")[1] == "") return results.innerHTML = "Keep typing coordinates to go to them! Format: <code>coords: 982, -183</code>"
                let coordQuery = searchbarinput.value.split(":")[1].split(",");
                if (coordQuery.length == 3) return results.innerHTML = "Please take out the Y coordinate! Format: <code>coords: 982, -183</code>"
                if (Number(coordQuery[0]) != NaN && Number(coordQuery[1] != NaN)) return results.innerHTML = `<a onclick="map.panTo(L.latLng(${pixelsToMeters(coordQuery[0])}, ${pixelsToMeters(coordQuery[1])}))" class="searchResult">
                <span class="resultIcon"><i class="fa-solid fa-compass"></i></span><p class="resultContent"><strong>X: ${coordQuery[0]}, Z: ${coordQuery[1]}</strong><br><small>Move map to this location</small></p><span class="resultArrow"><i class="fa-solid fa-circle-chevron-right"></i></span></a>`
                return results.innerHTML = "Your input doesn't look like coordinates! Format: <code>coords: 982, -183</code>"
            } else if (searchbarinput.value.toLowerCase().startsWith("user:") || searchbarinput.value.toLowerCase().startsWith("user :")) {
                if (searchbarinput.value.split(":")[1] == "") return results.innerHTML = "Begin typing to search for users!"
                let players = await (await fetch("/api/v1/search/users/" + searchbarinput.value.split(":")[1])).json()
                if (players.length == 0) {
                    return results.innerHTML = `We couldn't find <strong>${searchbarinput.value.split(":")[1]}</strong> in our records. :(`
                }
                results.innerHTML = ""
                players.sort((a, b) => a.username.length - b.username.length).slice(0, 4).forEach((element) => {
                    results.innerHTML += `<a onclick="window.loadProfile('${element.uuid}')" class="searchResult">
        <span class="resultIcon"><i class="fa-solid fa-person"></i></span><p class="resultContent"><strong>${element.username}</strong><br><small>View profile</small></p><span class="resultArrow"><i class="fa-solid fa-circle-chevron-right"></i></span></a>`
                })
                return;
            } else if (searchbarinput.value.toLowerCase().startsWith("item:") || searchbarinput.value.toLowerCase().startsWith("item :")) {
                if (searchbarinput.value.split(":")[1] == "") return results.innerHTML = "Begin typing to search for items!"
                let items = await (await fetch("https://pvcmapper.my.to/api/v1/search/items/" + searchbarinput.value.split(":")[1])).json();
                results.innerHTML = ""
                items.sort((a, b) => a.length - b.length).slice(0, 4).forEach((element) => {
                    results.innerHTML += `<a onclick="shopsByItem('${element}')" class="searchResult">
        <span class="resultIcon"><i class="fa-solid fa-box-open"></i></span><p class="resultContent"><strong>${toTitleCase(element.replace(/_/gm, " "))}</strong><br><small>Search for shops selling this item</small></p><span class="resultArrow"><i class="fa-solid fa-circle-chevron-right"></i></span></a>`
                })
                return;
            } else if (searchbarinput.value.toLowerCase().startsWith("shop:") || searchbarinput.value.toLowerCase().startsWith("shop :")) {
                if (searchbarinput.value.split(":")[1] == "") return results.innerHTML = "Keep typing coordinates to find a shop! Format: <code>shop: 982, -183</code>"
                let coordQuery = searchbarinput.value.split(":")[1].split(",");
                console.log(coordQuery)
                if (coordQuery.length == 3) return results.innerHTML = "Please take out the Y coordinate! Format: <code>shop: 982, -183</code>"
                if (Number(coordQuery[0]) != NaN && Number(coordQuery[1] != NaN)) return results.innerHTML = `<a onclick="shopsByLocation(${pixelsToMeters(coordQuery[0])}, ${pixelsToMeters(coordQuery[1])})" class="searchResult">
                <span class="resultIcon"><i class="fa-solid fa-box-open"></i></span><p class="resultContent"><strong>X: ${coordQuery[0]}, Z: ${coordQuery[1]}</strong><br><small>Search for shops at this location</small></p><span class="resultArrow"><i class="fa-solid fa-circle-chevron-right"></i></span></a>`
                return results.innerHTML = "Your input doesn't look like coordinates! Format: <code>shop: 982, -183</code>"
            }
            let res1 = await (await fetch("/api/v1/fetch/places/" + searchbarinput.value)).json();
            let res2 = await (await fetch("/api/v1/fetch/areas/" + searchbarinput.value)).json();
            //let res = res1.concat(res2)
            if (res1.length == 0 && res2.length == 0) {
                results.innerHTML = `There are no results for <strong>${searchbarinput.value}</strong>. Check your spelling!`
            } else {
                results.innerHTML = ""
                res1.forEach((element) => {
                    results.innerHTML += getResultHTML(element, false)
                })
                res2.forEach((element) => {
                    results.innerHTML += getResultHTML(element, true)
                })
            }
        }
    })

    window.copyToClip = (tis, text) => {
        navigator.clipboard.writeText(text)
        let origtext = tis.innerHTML;
        tis.innerHTML = "Copied!"
        setTimeout(() => tis.innerHTML = origtext, 1000)
    }

    updateProfileCredential = (type) => {
        switch (type) {
            case "wiki":
                fetch("/api/v1/setuserdetails/wiki", {
                    method: "POST",
                    body: JSON.stringify({
                        content: document.getElementById("wikiInput").value,
                        uuid: localStorage.getItem("localuuid"),
                        token: localStorage.getItem("sessionToken")
                    }),
                    headers: { "Content-Type": "application/json" }
                }).then(async (r) => {
                    let j = await r.json();
                    if (j.error) return alert("We encountered an error: " + j.error)
                    alert("Updated successfully!")
                }).catch((e) => {
                    alert("There was an error uploading your profile data!")
                })
                break;
            case "discord":
                fetch("/api/v1/setuserdetails/discord", {
                    method: "POST",
                    body: JSON.stringify({
                        content: document.getElementById("discordInput").value,
                        uuid: localStorage.getItem("localuuid"),
                        token: localStorage.getItem("sessionToken")
                    }),
                    headers: { "Content-Type": "application/json" }
                }).then(async (r) => {
                    let j = await r.json();
                    if (j.error) return alert("We encountered an error: " + j.error)
                    alert("Updated successfully!")
                }).catch((e) => {
                    alert("There was an error uploading your profile data!")
                })
                break;
            case "union":
                fetch("/api/v1/setuserdetails/union", {
                    method: "POST",
                    body: JSON.stringify({
                        content: document.getElementById("unionInput").value,
                        uuid: localStorage.getItem("localuuid"),
                        token: localStorage.getItem("sessionToken")
                    }),
                    headers: { "Content-Type": "application/json" }
                }).then(async (r) => {
                    let j = await r.json();
                    if (j.error) return alert("We encountered an error: " + j.error)
                    alert("Updated successfully!")
                }).catch((e) => {
                    alert("There was an error uploading your profile data!")
                })
                break;
            case "timezone":
                fetch("/api/v1/setuserdetails/timezone", {
                    method: "POST",
                    body: JSON.stringify({
                        content: document.getElementById("timezoneInput").value,
                        uuid: localStorage.getItem("localuuid"),
                        token: localStorage.getItem("sessionToken")
                    }),
                    headers: { "Content-Type": "application/json" }
                }).then(async (r) => {
                    let j = await r.json();
                    if (j.error) return alert("We encountered an error: " + j.error)
                    alert("Updated successfully!")
                }).catch((e) => {
                    alert("There was an error uploading your profile data!")
                })
                break;
            case "pose":
                fetch("/api/v1/setuserdetails/pose", {
                    method: "POST",
                    body: JSON.stringify({
                        content: document.getElementById("profilePoseInput").value,
                        uuid: localStorage.getItem("localuuid"),
                        token: localStorage.getItem("sessionToken")
                    }),
                    headers: { "Content-Type": "application/json" }
                }).then(async (r) => {
                    let j = await r.json();
                    if (j.error) return alert("We encountered an error: " + j.error)
                }).catch((e) => {
                    alert("There was an error uploading your profile data!")
                })
                break;
            case "style":
                fetch("/api/v1/setuserdetails/style", {
                    method: "POST",
                    body: JSON.stringify({
                        content: document.getElementById("profileBackgroundInput").value,
                        uuid: localStorage.getItem("localuuid"),
                        token: localStorage.getItem("sessionToken")
                    }),
                    headers: { "Content-Type": "application/json" }
                }).then(async (r) => {
                    let j = await r.json();
                    if (j.error) return alert("We encountered an error: " + j.error)
                }).catch((e) => {
                    alert("There was an error uploading your profile data!")
                })
                break;

            default:
                break;
        }
        window.loadProfile(localStorage.getItem("localuuid"))
    }

    // User profile sorting-out.
    window.loadProfile = async (uuid, preview) => {
        console.log(uuid)
        // No UUID means they don't have a localuuid saved :O
        if (!uuid) return window.location.href = "/login";

        document.getElementById("profileContent").innerHTML = ""
        let player = await (await fetch("/api/v1/player/" + uuid)).json();
        console.log(player)
        if (player.error && player.code == 404) {
            return;
        } else {
            profileOffcanvas.show()
            document.getElementById("searchBarCloseBtn").classList.remove("hidden");
            document.querySelector(".searchbarinput").value = "user:" + player.username;
            document.getElementById("profileContent").innerHTML += `<h4><strong>${player.username}</strong></h4>
                <small>${players.find((v) => v.uuid == player.uuid) ? "🟢 Online now!" : "🔴 Currently Offline"} • Last seen: ${new Date(player.lastjoin).toLocaleDateString("en-GB", { dateStyle: "short" })} @ ${new Date(player.lastjoin).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</small><br>
                <button id="profileViewUuidBtn" onclick="window.copyToClip(this, '${uuid}')" class="btn btn-sm btn-success">Copy User ID</button> <button id="profileViewLinkBtn" onclick="window.copyToClip(this, 'https://pvcmapper.my.to/profile/${uuid}')" class="btn btn-sm btn-success">Copy profile URL</button>
                <hr style="margin-bottom: 5px; margin-top: 5px;" />`;
            let user = await (await fetch("/api/v1/profile/" + uuid)).json();
            if (user.error && user.code == 404) {
                // Ignore and fetch just player data to show.
                document.getElementById("profileBGImage").src = `/assets/images/profileBackgrounds/FurnaceValley.jpg`
                document.getElementById("profileContent").innerHTML += `<i class="fa-solid fa-person-circle-xmark"></i> This user doesn't have a Mapper account :(`;
                document.getElementById("profileAvatar").src = `/api/v1/profilepicture/${player.username}/default/full`;
            } else {
                document.getElementById("profileBGImage").src = `/assets/images/profileBackgrounds/${user.profileStyle ?? "Spawn.png"}`
                document.getElementById("profileAvatar").src = `/api/v1/profilepicture/${player.username}/${user.profilePose ?? "default"}/full`;
                let texttoset = ``
                if (user.uuid != localStorage.getItem("localuuid") || preview) {
                    if (user.wiki) {
                        texttoset += `<i class="iconInTheThing fa-solid fa-book-atlas"></i> Wiki username: <code id="profileViewWiki">${user.wiki}</code> <a href="https://peaceful-vanilla-club.fandom.com/wiki/User:${user.wiki}"><button id="profileViewWikiBtn" class="btn btn-sm btn-success">Visit wiki page</button></a><br>`;
                    }
                    if (user.discord) {
                        texttoset += `<i class="iconInTheThing fa-brands fa-discord"></i> Discord username: <code id="profileViewDiscord">${user.discord}</code><br>`
                    }
                    if (user.timezone) {
                        texttoset += `<i class="iconInTheThing fa-solid fa-clock"></i> Timezone offset: GMT${user.timezone > -1 ? "+" : ""}${user.timezone}<br>`
                    }
                    if (user.union) {
                        texttoset += `<i class="iconInTheThing fa-solid fa-people-group"></i> Union: ${user.union} <br>`
                    }
                } else {
                    texttoset += `<strong>⚠️ Only add info here if you want people to see it.</strong><br>
                    Never put personal or sensitive information in your PVC Mapper profile.<br><br>`
                    texttoset += `<i class="iconInTheThing fa-solid fa-book-atlas"></i> <input placeholder="Wiki Username" id="wikiInput" type="text" value="${user.wiki ?? ""}" /> <button class="btn btn-sm btn-primary" onclick="updateProfileCredential('wiki')">Update</button><br>`
                    texttoset += `<i class="iconInTheThing fa-brands fa-discord"></i> <input placeholder="Discord username" id="discordInput" type="text" value="${user.discord ?? ""}" /> <button class="btn btn-sm btn-primary" onclick="updateProfileCredential('discord')">Update</button><br>`
                    texttoset += `<i class="iconInTheThing fa-solid fa-clock"></i> Timezone offset: <input min="-15" max="15" placeholder="Timezone Offset" id="timezoneInput" type="number" value="${user.timezone ?? 0}" /> <button class="btn btn-sm btn-primary" onclick="updateProfileCredential('timezone')">Update</button><br>`
                    texttoset += `<i class="iconInTheThing fa-solid fa-people-group"></i> <input placeholder="Union name" id="unionInput" type="text" value="${user.union ?? ""}" /> <button class="btn btn-sm btn-primary" onclick="updateProfileCredential('union')">Update</button><br>`
                    texttoset += `<i class="iconInTheThing fa-solid fa-person-rays"></i> Profile pose: <select onchange="updateProfileCredential('pose')" id="profilePoseInput">
                        <option selected disabled>Update pose</option>
                        <option value="default">Default</option>
                        <option value="marching">Marching</option>
                        <option value="walking">Walking</option>
                        <option value="crouching">Crouching</option>
                        <option value="crossed">Crossed</option>
                        <option value="ultimate">Regular</option>
                        <option value="cheering">Cheering</option>
                        <option value="trudging">Trudging</option>
                        <option value="lunging">Lunging</option>
                        <option value="facepalm">Facepalm</option>
                        <option value="sleeping">Sleeping</option>
                        <option value="archer">Archer</option>
                        <option value="kicking">Kicking</option>
                        <option value="mojavatar">Mini</option>
                        <option value="pixel">Flat</option>
                    </select><br>`
                    texttoset += `<i class="iconInTheThing fa-solid fa-person-through-window"></i> Profile background: <select id="profileBackgroundInput" onchange="updateProfileCredential('style')">
                        <option selected disabled>Set a new background</option>
                        <optgroup label="Best of Discord (2019-2021) (Imgur)">
                            <option value="Torches.jpeg">Torches by hoodiegirl</option>
                            <option value="Beds.png">Beds by KingNeme</option>
                            <option value="Spawn.png">Spawn by raynebowe</option>
                            <option value="Pray.png">Pray by raynebowe</option>
                            <option value="Woah.png">Woah by Tenshi</option>
                            <option value="Map.png">Flexxing Rylact's Map by Tenshi</option>
                            <option value="Pack.png">PVC's Pack.png by _Poke_</option>
                            <option value="NetherShop.png">NetherShop.png by _Poke_</option>
                            <option value="Notch.png">Found in the spawn by _Poke_</option>
                        </optgroup>
                        <optgroup label="KingNeme's Squid Collection">
                            <option value="SquidInTheRanch.png">Squid in Sunset Bay</option>
                            <option value="SquidInTheNether.png">Squid on the Llama Iceways</option>
                            <option value="SquidInTheRavine.png">Squid in the BIF Ravine</option>
                            <option value="SquidInTheSea.png">Squid in the sea</option>
                            <option value="SquidInTheSky.png">Squid in the sky</option>
                            <option value="SquidInTheTBS.png">Squid in TBS City</option>
                            <option value="SquidOnTheMapart.png">Squid on the map-art</option>
                        </optgroup>
                        <optgroup label="Marshall's Classic Screenshots">
                            <option value="MysteriousPillar.png">Mysterious Pillar</option>
                            <option value="Castle.png">Castle</option>
                            <option value="David.png">David outside shop</option>
                            <option value="BoatCanal.png">Boat in Canal</option>
                            <option value="DragonEgg.png">Dragon Egg Mountain</option>
                        </optgroup>
                        <optgroup label="Classic Screenshots (Website)">
                            <option value="FurnaceValley.jpg">Furnace Valley</option>
                            <option value="RailwayVilla.jpg">Nietzsche's Victorian Villa</option>
                            <option value="IronGolem.jpg">Iron Golem</option>
                            <option value="Quarry.jpg">Quarry</option>
                            <option value="Brick Castle.jpg">Brick Castle</option>
                            <option value="CobbleIsle.jpg">Cobblestone Island</option>
                            <option value="SmokeCity.jpg">Smoke City</option>
                        </optgroup>
                    </select><br>`
                    texttoset += `<button class="btn btn-primary btn-sm" onclick="window.loadProfile('${localStorage.getItem("localuuid")}', true)">Preview Profile</button><br>`
                }


                texttoset += `<i class="iconInTheThing fa-solid fa-stopwatch"></i> Joined Mapper: ${new Date(user.creation).toLocaleString("en-US")}`;

                document.getElementById("profileContent").innerHTML += texttoset;
            }
        }
    }
    // Show small tooltip showing where the menu is, when you're new!
    let t = new bootstrap.Tooltip('#localProfilePicture', {
        boundary: document.body,
        title: "Hey there! Click the little profile picture up here to see the menu!",
        placement: "bottom",
        fallbackPlacements: ["right"],
        delay: { show: 500 },
    })

    t.show()

    setTimeout(() => {
        t.hide()
    }, 5000)
}
go()

let qamodal = new bootstrap.Modal("#quickAddModal");
function openQuickAdd(e) {
    if (localStorage.getItem("localuuid")) {
        qamodal.show()
    } else {
        new bootstrap.Modal("#loginModal").show()
    }
}

async function quickAdd() {
    let qa = await fetch("/api/v1/create/quickadd", {
        method: "POST",
        body: JSON.stringify({
            type: document.getElementById("quickAddType").value,
            x: document.getElementById("quickAddX").value,
            z: document.getElementById("quickAddZ").value,
            name: document.getElementById("quickAddName").value,
            uuid: localStorage.getItem("localuuid"),
            session: localStorage.getItem("sessionToken"),
            dimension: currentDimension
        }),
        headers: { "Content-Type": "application/json" }
    })
    let qares = await qa.json();
    if (qares.status == "OK") {
        qamodal.hide();
        map.setView(L.latLng(pixelsToMeters(document.getElementById("quickAddZ").value), pixelsToMeters(document.getElementById("quickAddX").value)), 8)
    }
}

let placesOffcanvas = new bootstrap.Offcanvas("#placeDetailOffcanvas")
let shopsOffcanvas = new bootstrap.Offcanvas("#shopsOffcanvas")
let profileOffcanvas = new bootstrap.Offcanvas("#profileOffcanvas")
let onlineNowOffcanvas = new bootstrap.Offcanvas("#onlineNowOffcanvas")
let menuOffcanvas = new bootstrap.Offcanvas("#offcanvas")
let popularOffcanvas = new bootstrap.Offcanvas("#popularOffcanvas")
let areaPolygon;
function closePlaceOffcanvas() {
    if (areaPolygon?.length > 0) {
        areaPolygon[0].remove()
        areaPolygon[1].remove()
        areaPolygon = [];
    }
    document.getElementById("postReviewBtn").removeAttribute("disabled")
    console.log("Closing all offcanvases")
    shopsOffcanvas.hide()
    placesOffcanvas.hide()
    profileOffcanvas.hide()
    onlineNowOffcanvas.hide()
    menuOffcanvas.hide()
    popularOffcanvas.hide()
    document.getElementById("searchBarCloseBtn").classList.add("hidden");
    document.querySelector(".searchbarinput").value = "";
    document.querySelector(".searchbarinstructions").innerHTML = defaultsearchinstructions
    document.getElementById("profileAvatar").src = `/assets/images/textures/blank.png`;
    //document.getElementById("profileBackground").src = `/assets/images/textures/blank.png`;
}

function openMenuOffcanvas() {
    closePlaceOffcanvas()
    menuOffcanvas.show()
}

// 1 seconds ago
// 5 years ago
// etc etc
function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " year(s)";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " month(s)";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " day(s)";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hour(s)";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minute(s)";
    }
    return Math.floor(seconds) + " second(s)";
}

let openedPlaceID;
async function openPlaceOffcanvas(placeid) {
    closePlaceOffcanvas()
    let place = await (await fetch("/api/v1/fetch/places/byid/" + placeid)).json();
    let pane = document.getElementById("placeInfo");
    if (place.error) return pane.innerHTML = "Error while finding place.<br>" + place.error;
    document.querySelector(".searchbarinput").value = place.name;
    // Insert stuff to add place detail info to offcanvas
    openedPlaceID = placeid;
    pane.innerHTML = ""
    if (place.images) {
        document.getElementById('placeDetailImg').src = place.images + "?t=" + Date.now();
    } else {
        document.getElementById('placeDetailImg').src = '/assets/images/ImagePlaceholder.png'
    }
    pane.innerHTML += `<h4 style="font-weight: bolder; margin-top: 15px; margin-bottom: 3px;">${place.name}</h4>`
    pane.innerHTML += `<small>${toTitleCase(place.type)} • ID: P${place.id} • ${place.x} ${place.z}</small>`
    pane.innerHTML += `<hr style="margin-top: 5px; margin-bottom: 5px;" />`
    if (place.description) pane.innerHTML += `${place.description}
    <hr style="margin-top: 5px; margin-bottom: 5px;" />`
    pane.innerHTML += `<a class="placeDetailLocation" onclick="navigator.clipboard.writeText('${place.dimension == "minecraft_overworld" ? "Overworld" : "Nether"} ${place.x}, ${place.z}');alert('Coordinates copied to clipboard!')" >
                    <span style="flex: 0.85; display: flex; ">
                        Coordinates: ${place.x}, ${place.z}<br>
                        Dimension: ${place.dimension == "minecraft_overworld" ? "Overworld" : "Nether"}
                    </span>
                    <div style="flex: 0.15; display: flex; font-size: 25px; align-items: center;">
                        <i class="fa-solid fa-copy"></i>
                    </div>
                </a>
                <hr style="margin-top: 5px; margin-bottom: 15px;" />`
    if (place.wiki) {
        pane.innerHTML += `<i class="fa-solid fa-globe"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i> <a href="${place.wiki}">${new URL(place.wiki).host == "peaceful-vanilla-club.fandom.com" ? place.wiki.split("peaceful-vanilla-club.fandom.com/wiki/")[1].replace(/_/gm, " ").split("?")[0] + '<i class="fa-solid fa-up-right-from-square"></i></a> (PVC Wiki)' : place.wiki + '<i class="fa-solid fa-up-right-from-square"></i></a> (⚠️ This is an External Site - Not affiliated with Peaceful Vanilla Club or PVC Mapper)'} <br>
                        `

        if (new URL(place.wiki).host == "peaceful-vanilla-club.fandom.com") pane.innerHTML += `<button class="btn btn-sm btn-secondary" onclick="document.getElementById('wikiPreview').classList.toggle('hidden')" >Show/Hide Preview <span class="badge bg-primary">BETA</span></button><br><iframe id="wikiPreview" class="hidden" style="width: 100%;" height="400" src="https://breezewiki.com/peaceful-vanilla-club/wiki/${place.wiki.split("/wiki/")[1]}"></iframe>`;
        pane.innerHTML += `<hr style="margin-top: 15px; margin-bottom:15px;" />`
    }


    if (place.createdBy) pane.innerHTML += `<span><i class="fa-solid fa-person"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i>
                    ${place.createdBy}</span><br>`


    let month = ["Month 0", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    if (new Date(place.dateCreated).getFullYear() != 2000) pane.innerHTML += `<span><i class="fa-solid fa-calendar-days"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i>
                    ${new Date(place.dateCreated).getMonth() == 0 ? "" : month[new Date(place.dateCreated).getMonth()]} ${new Date(place.dateCreated).getFullYear()}</span>
                <hr style="margin-top: 15px; margin-bottom: 5px;" />`
    if (place.features.portal) pane.innerHTML += `<span><i class="iconInTheThing fa-solid fa-dungeon"
                        ></i> Has Nether
                    Portal Access nearby</span><br>`
    if (place.features.echest) pane.innerHTML += `<span><i class="iconInTheThing fa-solid fa-toolbox"
                        ></i> Has Ender
                    Chest Access nearby</span><br>`
    if (place.features.public) pane.innerHTML += `
                <span><i class="iconInTheThing fa-solid fa-door-open"
                        ></i> Made for
                    public use </span><br>`
    if (place.features.historical) pane.innerHTML += `
                <span><i class="iconInThingThing fa-solid fa-chess-rook"
                        ></i> Historical
                    Place - No longer in use!</span><br>`
    pane.innerHTML += `<hr>`
    pane.innerHTML += `<span onclick="window.viewProfile('${place.addedBy.uuid}')"><i class="fa-solid fa-person"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i>
                    Added to Mapper by ${place.addedBy.name}</span><br>`
    if (place.edits.length > 0) {
        let editorList = place.edits[0].name;
        place.edits.forEach((e, i) => {
            if(i == 0) return;
            editorList += (", " + e.name);
        })
        pane.innerHTML += `<span><i class="fa-solid fa-person"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i>
                    Edits made by ${editorList}</span><br>` 
    }
    placesOffcanvas.show()
    // Reviews can be loaded afterwards, in case we have a dreaded slow connection
    // A SLOW CONNECTION?? NOOOOOOOOOOOOOOOOO
    let reviews = await (await fetch("/api/v1/fetch/reviews/byplace/" + placeid)).json();
    document.getElementById("reviewsList").innerHTML = ""
    document.getElementById("numberOfReviews").innerText = reviews.length;
    if (reviews.length == 0) {
        document.getElementById("reviewsList").innerHTML = `<span style="margin-bottom: 16px;"><strong>No reviews yet!</strong> Lets post one!</span>`
    } else {
        for (const review of reviews) {
            document.getElementById("reviewsList").innerHTML += `<div class="review">
            <span><img src="/api/v1/profilepicture/${review.postedBy.uuid}" width="32" height="32"> ${review.postedBy.name} <small>${timeSince(new Date(review.postedOn))} ago</small><br>${review.content}</span>
            <hr style="margin-top: 5px; margin-bottom: 5px;" />
        </div>`
        }
    }
    document.getElementById("searchBarCloseBtn").classList.remove("hidden")
}

function openOnlineNowOffcanvas() {
    closePlaceOffcanvas()
    document.getElementById("searchBarCloseBtn").classList.remove("hidden");
    onlineNowOffcanvas.show()
}

let openedAreaID
async function openAreaOffcanvas(areaid) {
    closePlaceOffcanvas()
    let area = await (await fetch("/api/v1/fetch/area/byid/" + areaid)).json();
    let pane = document.getElementById("placeInfo");
    if (area.error) return pane.innerHTML = "Error while finding area.<br>" + place.error;
    document.querySelector(".searchbarinput").value = area.name;
    // Insert stuff to add place detail info to offcanvas
    openedAreaID = areaid;
    pane.innerHTML = ""
    if (area.image) {
        document.getElementById('placeDetailImg').src = area.image + "?t=" + Date.now();
    } else {
        document.getElementById('placeDetailImg').src = '/assets/images/ImagePlaceholder.png'
    }
    pane.innerHTML += `<h4 style="font-weight: bolder; margin-top: 15px; margin-bottom: 3px;">${area.name}</h4>`
    pane.innerHTML += `<small>${toTitleCase(area.type)} • ID: A${area.id}</small>`
    pane.innerHTML += `<hr style="margin-top: 5px; margin-bottom: 5px;" />`
    if (area.description) pane.innerHTML += `${area.description}
    <hr style="margin-top: 5px; margin-bottom: 5px;" />`
    pane.innerHTML += `<a class="placeDetailLocation" onclick="navigator.clipboard.writeText('${area.dimension == "minecraft_overworld" ? "Overworld" : "Nether"} - Centre: ${metersToPixels(area.x)}, ${metersToPixels(area.z)}');alert('Coordinates copied to clipboard!')" >
                    <span style="flex: 0.85; display: flex; ">
                        Centre Coordinates: ${metersToPixels(area.x)}, ${metersToPixels(area.z)}<br>
                        Dimension: ${area.dimension == "minecraft_overworld" ? "Overworld" : "Nether"}
                    </span>
                    <div style="flex: 0.15; display: flex; font-size: 25px; align-items: center;">
                        <i class="fa-solid fa-copy"></i>
                    </div>
                </a>
                <hr style="margin-top: 5px; margin-bottom: 15px;" />`
    if (area.wiki) {
        pane.innerHTML += `<i class="fa-solid fa-globe"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i> <a href="${area.wiki}">${new URL(area.wiki).host == "peaceful-vanilla-club.fandom.com" ? area.wiki.split("peaceful-vanilla-club.fandom.com/wiki/")[1].replace(/_/gm, " ").split("?")[0] + '<i class="fa-solid fa-up-right-from-square"></i></a> (PVC Wiki)' : area.wiki + '<i class="fa-solid fa-up-right-from-square"></i></a> (⚠️ This is an External Site - Not affiliated with Peaceful Vanilla Club or PVC Mapper)'} <br>
                        `

        if (new URL(area.wiki).host == "peaceful-vanilla-club.fandom.com") pane.innerHTML += `<button class="btn btn-sm btn-secondary" onclick="document.getElementById('wikiPreview').classList.toggle('hidden')" >Show/Hide Preview <span class="badge bg-primary">BETA</span></button><br><iframe id="wikiPreview" class="hidden" style="width: 100%;" height="400" src="https://breezewiki.com/peaceful-vanilla-club/wiki/${area.wiki.split("/wiki/")[1]}"></iframe>`;
    }
    pane.innerHTML += `<span onclick="window.viewProfile('${area.addedBy.uuid}')"><i class="fa-solid fa-person"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i>
                    Added to Mapper by ${area.addedBy.username}</span><br>`
    if (area.edits.length > 0) {
        let editorList = area.edits[0].username;
        area.edits.forEach((e, i) => {
            if(i == 0) return;
            editorList += (", " + e.name);
        })
        pane.innerHTML += `<span><i class="fa-solid fa-person"
                        style="width: 20px; font-size: 20px; display: inline-block; margin-right: 3px;"></i>
                    Edits made by ${editorList}</span><br>` 
    }
    console.log(area.bounds)
    areaPolygon = [
        L.polygon(area.bounds, {
            color: "#f91b02"
        }).addTo(map),
        L.polygon(area.bounds, {
            color: "#ffffff",
            dashArray: [10]
        }).addTo(map)
    ]
    placesOffcanvas.show()
    document.getElementById("reviewsList").innerHTML = "Reviews cannot be posted on areas yet. Sorry!"
    document.getElementById("postReviewBtn").setAttribute("disabled", true)
    document.getElementById("searchBarCloseBtn").classList.remove("hidden")
    map.fitBounds(area.bounds, { padding: [50, 50] });
}

async function postReview() {
    let contentToPost = document.getElementById("reviewInput");
    if (contentToPost.length < 3) return;
    let postResult = await (await fetch("/api/v1/create/review/" + openedPlaceID, {
        method: "POST",
        body: JSON.stringify({
            name: nom,
            session: localStorage.getItem("sessionToken"),
            uuid: localStorage.getItem("localuuid"),
            content: contentToPost.value
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })).json();
    if (postResult.error) return alert("An error occurred when posting your review: " + postResult.error)
    document.getElementById("reviewsList").innerHTML = `<div class="review">
        <span><img src="/api/v1/profilepicture/${localStorage.getItem("localuuid")}" width="32" height="32"> ${nom} <small>Just now</small><br>${contentToPost.value}</span>
        <hr style="margin-top: 5px; margin-bottom: 5px;" />
    </div>` + document.getElementById("reviewsList").innerHTML
    contentToPost.value = ""
}

async function placesByPopularity() {
    closePlaceOffcanvas();
    document.getElementById("searchBarCloseBtn").classList.remove("hidden");
    let popularPlaces = await (await fetch("/api/v1/fetch/places/mostPopular")).json()
    let placeList = document.getElementById("placesList");
    placeList.innerHTML = ""
    popularPlaces.forEach((place, index) => {
        placeList.innerHTML += `<div class="popularPlacesItem" onclick="openPlaceOffcanvas(${place.id})">
        <h1 style="font-size: 32px; float: left; margin-right: 10px;"><small style="font-size: 15px;">#</small>${index + 1}</h1> <div style="width: 70%; display:inline-block;"><strong>${place.name}</strong><br><small>${place.x}, ${place.z} • ${convertIDToPretty(place.dimension)} • ${place.hits ?? 0} Hits</small></div><span class="resultArrow"><i class="fa-solid fa-circle-chevron-right" style="float:right; display: inline-block;"></i></span>
        </div>`
    })
    popularOffcanvas.show();
}

// Shopping! Yay!
async function shopsByLiterallyNoFilterWhatsoever() {
    closePlaceOffcanvas()
    let shopStats = await (await fetch("https://api.pvc-utils.xyz/stats")).json()
    document.getElementById("searchBarCloseBtn").classList.remove("hidden");
    document.getElementById("numberOfTrades").innerText = shopStats.shopStats.tradeCount;
    document.getElementById("tradeSearchQuery").innerText = "All shops";
    document.getElementById("tradesList").innerHTML = `<strong><i class="fa-solid fa-medal"></i> Top Players:</strong><br>
    <small>
        <i class="fa-solid fa-shop"></i> Most Shops: <strong>${Object.keys(shopStats.leaderboard.mostShops)[0]}</strong> (${shopStats.leaderboard.mostShops[Object.keys(shopStats.leaderboard.mostShops)[0]]} shops)<br>
        <i class="fa-solid fa-boxes-stacked"></i> Most Stock: <strong>${Object.keys(shopStats.leaderboard.mostStock)[0]}</strong> (${shopStats.leaderboard.mostStock[Object.keys(shopStats.leaderboard.mostStock)[0]]} items)<br>
        <i class="fa-solid fa-handshake"></i> Most Available Trades: <strong>${Object.keys(shopStats.leaderboard.mostTrades)[0]}</strong> (${shopStats.leaderboard.mostTrades[Object.keys(shopStats.leaderboard.mostTrades)[0]]} trades)<br>
        <i class="fa-solid fa-star"></i> Most Unique Items: <strong>${Object.keys(shopStats.leaderboard.mostUniqueItems)[0]}</strong> (${shopStats.leaderboard.mostUniqueItems[Object.keys(shopStats.leaderboard.mostUniqueItems)[0]]} trades)<br>
        <br><br>
        </small><strong>Statistics</strong><small><br>
        The Peaceful Vanilla Club server has ${shopStats.shopStats.shopCount} traders, containing ${shopStats.shopStats.tradeCount} trades, offered by ${shopStats.shopStats.sellerCount} players! Thanks everyone! <3
        <br><br>
        </small><strong>More Tools:</strong><small><br>
        <button class="btn btn-sm btn-secondary" onclick="shopsByLocation(0, 0, 30000, 0)">View ALL Trades</button> (Very slow, might take a while)<br>
        <button class="btn btn-sm btn-secondary">Stocks Viewer <span class="badge text-bg-info">Coming Soon</span></button> Check out the pricing of things<br>
        <br><br><br>All shop statistics and trade information are taken from <a href="https://pvc-utils.xyz">_Easter's unofficial shops viewer</a>. Check it out for more detailed information!
    </small>`
    shopsOffcanvas.show()
}

async function shopsByItem(item) {
    closePlaceOffcanvas()
    let trades = (await (await fetch("https://api.pvc-utils.xyz/tradesByItem/" + item)).json()).sort((a, b) => a.normalizedPrice - b.normalizedPrice);
    document.getElementById("searchBarCloseBtn").classList.remove("hidden");
    document.querySelector(".searchbarinput").value = "item:" + toTitleCase(item.replace(/_/gm, " "));
    document.getElementById("numberOfTrades").innerText = trades.length;
    document.getElementById("tradeSearchQuery").innerText = toTitleCase(item.replace(/_/gm, " "))
    document.getElementById("tradesList").innerHTML = ""
    if (trades.length == 0) {
        document.getElementById("tradesList").innerHTML = "<strong>No trades found!</strong><br>Try again with a different item!"
    } else {
        for (const trade of trades) {
            let tradepart2, enchants = [];
            if ((trade.enchants ?? []).length > 0) {
                for (i of trade.enchants) {
                    enchants.push(`${toTitleCase(Object.keys(i)[0].split(":")[1].replace(/_/gm, " "))} ${romanize(i[Object.keys(i)[0]])}`);
                }
            }
            let shopmapcoords = trade.location.replace(/,/gm, "").split(" ")
            if (trade.currency2) tradepart2 = `<div style="flex: 0.3">
                            <img style="margin-right: 5px; border: 5px solid grey;"" src="/api/v1/fetch/image/${trade.currency2 ? trade.currency2 : "blank"}" height="32" width="32"><small>${trade.price2 ? trade.price2.toString() + "x" : ""} ${trade.currency2 ? toTitleCase(trade.currency2.replace(/_/gm, " ")) : ""}</small>
                        </div>`
            document.getElementById("tradesList").innerHTML += `<div class="tradeResult">
                    <strong>${trade.shopName == "" ? "Shop" : trade.shopName}</strong> by <strong>${trade.shopOwner}</strong><br>
                    <small>${trade.stock == 0 ? '<span style="color: red">None</span>' : trade.stock} available ${trade.enchants ? "• Enchants:" : ""} ${enchants.join(", ")} ${trade.inShulker ? "• Comes in shulker" : ""}</small><br>
                    <div style="width: 100%; display: flex;">
                        <div style="flex: ${trade.currency2 ? "0.3" : "0.45"}">
                            <img style="margin-right: 5px; border: 5px solid grey;" src="/api/v1/fetch/image/${trade.currency}" height="32" width="32"><small>${trade.price}x ${toTitleCase(trade.currency.replace(/_/gm, " "))}</small>
                        </div>
                        ${tradepart2 ?? ""}
                        <div style="flex: 0.1">
                            <i class="fa-solid fa-right-long"></i>
                        </div>
                        <div style="flex: ${trade.currency2 ? "0.3" : "0.45"}">
                            <img style="margin-right: 5px; border: 5px solid grey;"" src="/api/v1/fetch/image/${trade.item}" height="32" width="32"><small>${trade.tradeAmount}x ${toTitleCase(trade.item.replace(/_/gm, " "))}</small>
                        </div>
                    </div><br>
                    <small>${trade.location} - <a href="#" onclick="map.setView(L.latLng(${pixelsToMeters(shopmapcoords[2])}, ${pixelsToMeters(shopmapcoords[0])}), 8)">Visit on map</a></small>
                    <hr style="margin-bottom: 5px; margin-top: 5px;" />
                </div>`
        }
    }
    shopsOffcanvas.show()
}

async function shopsByLocation(x, z, radius, page) {
    if (page < 0) return;
    let trades = (await (await fetch(`https://api.pvc-utils.xyz/tradesByLocation/${metersToPixels(x)}/${metersToPixels(z)}/${radius ?? 1}`)).json()).sort((a, b) => a.normalizedPrice - b.normalizedPrice);
    if (!page) closePlaceOffcanvas()
    document.getElementById("searchBarCloseBtn").classList.remove("hidden");
    document.querySelector(".searchbarinput").value = `Shop: ${metersToPixels(x)}, ${metersToPixels(z)}`;
    document.getElementById("numberOfTrades").innerText = trades.length;
    document.getElementById("tradeSearchQuery").innerText = `${metersToPixels(x)}, ${metersToPixels(z)}`;
    document.getElementById("tradesList").innerHTML = "";
    if (trades.length == 0) {
        document.getElementById("tradesList").innerHTML = "<strong>No trades found!</strong><br>Try again with a different shopkeeper!"
    } else {
        // Paginate - Bottom of page
        if (trades.length > 25) {
            document.getElementById("tradesList").innerHTML += `<button class="btn btn-secondary btn-sm" onclick="shopsByLocation(${x}, ${z}, ${radius}, ${(page ?? 0) - 1})" ${page > 0 ? "" : "disabled"}>⬅️ Prev. Page</button> • Page: ${(page ?? 0) + 1} • <button class="btn btn-sm btn-secondary" onclick="shopsByLocation(${x}, ${z}, ${radius}, ${(page ?? 0) + 1})" ${trades.length >= (25 * page)}>Next Page ➡️</button> `
        }
        for (const trade of trades.splice((25 * page) - 1, 25)) {
            let tradepart2, enchants = [];
            if ((trade.enchants ?? []).length > 0) {
                for (i of trade.enchants) {
                    enchants.push(`${toTitleCase(Object.keys(i)[0].split(":")[1].replace(/_/gm, " "))} ${romanize(i[Object.keys(i)[0]])}`);
                }
            }
            if (trade.currency2) tradepart2 = `<div style="flex: 0.3">
                            <img style="margin-right: 5px; border: 5px solid grey; object-fit: cover; object-position: 0% 0%;" src="/api/v1/fetch/image/${trade.currency2 ? trade.currency2 : "blank"}" height="32" width="32"><small>${trade.price2 ? trade.price2.toString() + "x" : ""} ${trade.currency2 ? toTitleCase(trade.currency2.replace(/_/gm, " ")) : ""}</small>
                        </div>`
            document.getElementById("tradesList").innerHTML += `<div class="tradeResult">
                    <strong>${trade.shopName == "" ? "Shop" : trade.shopName}</strong> by <strong>${trade.shopOwner}</strong><br>
                    <small>${trade.stock == 0 ? '<span style="color: red">None</span>' : trade.stock} available ${trade.enchants ? "• Enchants:" : ""} ${enchants.join(", ")}</small><br>
                    <div style="width: 100%; display: flex;">
                        <div style="flex: ${trade.currency2 ? "0.3" : "0.45"}">
                            <img style="margin-right: 5px; border: 5px solid grey; object-fit: cover; object-position: 0% 0%;" src="/api/v1/fetch/image/${trade.currency}" height="32" width="32"><small>${trade.price}x ${toTitleCase(trade.currency.replace(/_/gm, " "))}</small>
                        </div>
                        ${tradepart2 ?? ""}
                        <div style="flex: 0.1">
                            <i class="fa-solid fa-right-long"></i>
                        </div>
                        <div style="flex: ${trade.currency2 ? "0.3" : "0.45"}">
                            <img style="margin-right: 5px; border: 5px solid grey;  object-fit: cover; object-position: 0% 0%;" src="/api/v1/fetch/image/${trade.item}" height="32" width="32"><small>${trade.tradeAmount}x ${trade.customName ?? toTitleCase(trade.item.replace(/_/gm, " "))}</small>
                        </div>
                    </div><br>
                    <small>${trade.location} - <a href="#">Visit on map</a></small>
                    <hr style="margin-bottom: 5px; margin-top: 5px;" />
                </div>`
        }

        // Paginate - Bottom of page
        if (trades.length > 25) {
            document.getElementById("tradesList").innerHTML += `<button class="btn btn-secondary btn-sm" onclick="shopsByLocation(${x}, ${z}, ${radius}, ${(page ?? 0) - 1})" ${page > 0 ? "" : "disabled"}>⬅️ Prev. Page</button> • Page: ${(page ?? 0) + 1} • <button class="btn btn-sm btn-secondary" onclick="shopsByLocation(${x}, ${z}, ${radius}, ${(page ?? 0) + 1})" ${trades.length >= (25 * page)}>Next Page ➡️</button> `
        }
    }

    shopsOffcanvas.show()
}

async function openProfileOffcanvas() {
    profileOffcanvas.show()
}