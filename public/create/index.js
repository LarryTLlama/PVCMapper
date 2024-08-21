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
    return [Math.round(num[1] / getScale()), Math.round(num[0] / getScale())];
}

var currDim = "minecraft_overworld";
document.getElementById("dimensionswitch").addEventListener("click", () => {
    console.log(currDim)
    if (currDim == "minecraft_overworld") {
        document.getElementById("dimensionswitch").innerText = "Adding to Nether (Switch to Overworld)";
        currDim = "minecraft_the_nether";
        return;
    } else {
        document.getElementById("dimensionswitch").innerText = "Adding to Overworld (Switch to Nether)";
        currDim = "minecraft_overworld";
        return;
    }
})
// Initialise the login modal
if (window.outerWidth < 1350) {
    let inps = document.getElementById("inputs");
    inps.classList.remove("col-md-3")
    inps.classList.add("col-md-6");
    let maps = document.getElementById("map");
    maps.classList.remove("col-md-9")
    maps.classList.add("col-md-6");
}
let loginmodal = new bootstrap.Modal("#loginmodal");
loginmodal.show()
let templatemodal = new bootstrap.Modal("#templatemodal");
document.getElementById("locationtemplate").addEventListener("click", () => {
    newLocation(currDim)
})
document.getElementById("areatemplate").addEventListener("click", () => {
    newArea(currDim)
})
// Check for credentials
async function checkCredentials() {
    if (localStorage.getItem("sessionToken")) {
        let res = await fetch("/api/v1/sessionVerify/" + localStorage.getItem("localuuid"), {
            method: "POST",
            body: JSON.stringify({
                sessionToken: localStorage.getItem("sessionToken")
            }),
            headers: { "Content-Type": "application/json" }
        })
        let verify = await res.json();
        if (verify.verified == true) {
            // User is logged in, and can access the editor. Yay! :D
            loginmodal.hide();
            templatemodal.show()

        } else {
            // Do something to tell them to log in...
            document.getElementById("loginStuff").innerHTML = `You'll need to be logged in to make edits to the Mapper.<br>
        <a style="margin-right: 10px;" href="/signup"><button class="btn btn-success">Create an account.</button></a><a style="margin-left: 10px;" href="/login"><button class="btn btn-success">Log in.</button></a>`
        }
    } else {
        // Do something to tell them to log in...
        document.getElementById("loginStuff").innerHTML = `You'll need to be logged in to make edits to the Mapper.<br>
    <a style="margin-right: 10px;" href="/signup"><button class="btn btn-success">Create an account.</button></a><a style="margin-left: 10px;" href="/login"><button class="btn btn-success">Log in.</button></a>`
    }
}

checkCredentials()

var map;
var previewCoords = [];
var circles = [];
var polygon;
function updateAreaPreview(newcoords, del) {
    console.log(newcoords)
    console.log(del)
    if (del) {
        if (previewCoords.length > 0) {
            if (typeof del == "boolean") {
                console.log("ITS A BOOL YOU FOOL")
                previewCoords.splice(previewCoords.length - 1, 1)
            } else if (typeof del == "object") {
                console.log("COMPARE")
                console.log(previewCoords)
                console.log(del)
                previewCoords.splice(previewCoords.findIndex((v) => v.lat == del.lat && v.lng == del.lng), 1)
            }
        }
    }
    if (newcoords) {
        previewCoords.push(newcoords);
    }
    if (polygon) {
        polygon.remove();
        for (const i of circles) {
            i.remove()
        }
    }
    console.log(previewCoords)
    for (const i of previewCoords) {
        circles.push(L.circleMarker(i, { radius: 5, color: "orange" }).addTo(map))
    }
    polygon = L.polygon(previewCoords, { color: "lightblue" }).addTo(map)

}

function loadmap(dimension, type) {

    map = L.map(document.querySelector("#map"), {
        center: [0, 0],
        zoom: 5,
        crs: L.Util.extend(L.CRS.Simple, {
            // we need to flip the y-axis correctly
            // https://stackoverflow.com/a/62320569/3530727
            transformation: new L.Transformation(1, 0, 1, 0)
        }),
        zoomSnap: 0,
        zoomDelta: 0.25,
        rotate: true,
        rotateControl: {
            closeOnZeroBearing: true,
        },
        shiftKeyRotate: true,
        touchRotate: false,
    });
    if (type == "place") {
        map.on("click", (e) => {
            document.getElementById("placeX").value = metersToPixels(e.latlng.lng);
            document.getElementById("placeZ").value = metersToPixels(e.latlng.lat);
        })
    } else if (type == "area") {
        // Add a new vertex on click
        map.on("click", (e) => {
            updateAreaPreview(e.latlng)
            document.getElementById("areaVertices").innerHTML += `<div class="coordSet">
                        <div class="input-group">
                            <span class="input-group-text">Coords</span>
                            <input type="number" placeholder="X Coord" aria-label="X" value="${metersToPixels(e.latlng.lng)}" class="form-control areaVertexX">
                            <input type="number" placeholder="Z Coord" aria-label="Z" value="${metersToPixels(e.latlng.lat)}" class="form-control areaVertexZ">
                            <button class="btn btn-outline-danger" type="button" id="delBtn" onclick="this.parentNode.parentNode.remove();updateAreaPreview(null,L.latLng(${e.latlng.lat}, ${e.latlng.lng}))"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>`;

        })

        map.on("contextmenu", (e) => {
            updateAreaPreview(null, true)
            let els = document.getElementsByClassName("coordSet")
            els[els.length - 1].remove()
        })
    }

    if (dimension == "minecraft_overworld") {
        const Overworld = L.TileLayer.extend({
            getTileUrl(coords) {
                return window.location.protocol + "//" + window.location.host + `/maps/minecraft_overworld/${coords.z}/${coords.x}_${coords.y}.png`;
            },
            options: {
                noWrap: true,
                bounds: [[-1000, -1000], [1000, 1000]],
                minZoom: 0,
                maxZoom: 8.9,
                tileSize: 512
            },
        });
        // Here's our freshly baked tile layers
        new Overworld().addTo(map);
    } else if (dimension == "minecraft_the_nether") {
        // And one for the nether
        const Nether = L.TileLayer.extend({
            getTileUrl(coords) {
                return window.location.protocol + "//" + window.location.host + `/maps/minecraft_the_nether/${coords.z}/${coords.x}_${coords.y}.png`;
            },
            options: {
                noWrap: true,
                bounds: [[-1000, -1000], [1000, 1000]],
                minZoom: 0,
                maxZoom: 8.5,
                tileSize: 512
            },
        });
        // Nether one is made, but not added (yet)
        new Nether().addTo(map);
    }
}

let editModal = new bootstrap.Modal("#chooseEditModal");
function openEditModal() {
    loginmodal.hide();
    templatemodal.hide();
    editModal.show();
}

async function spinUpEdit() {
    let id = document.getElementById("placeToEditID").value;
    document.getElementById("editModalFooter").innerText = "Importing info to the editor. This might take a moment!"
    if (id.toLowerCase().startsWith("a")) {
        newArea(null, id.substring(1))
    } else if(id.toLowerCase().startsWith("p")) {
        newLocation(null, id.substring(1))
    } else {
        document.getElementById("editModalFooter").innerText = "Invalid ID!"
    }
}

async function setSelectMenuValue(id, value) {
    for (const i of Array.from(document.getElementById(id).children)) {
        if (i.getAttribute("value") == value) i.setAttribute("selected", "true")
    }
}

// Sets up thingz to create a new area
async function newArea(dimension, id) {
    let name = document.getElementById("areaName"),
        desc = document.getElementById("areaDesc"),
        wiki = document.getElementById("areaWiki"),
        type = document.getElementById("areaType"),
        image = document.getElementById("areaImage"),
        imgurl;
    if (id) {
        // We want to edit
        let area = await (await fetch("/api/v1/fetch/area/byid/" + id)).json();
        if (!area) return document.getElementById("editModalFooter").innerText = "Couldn't find an area with that ID."
        name.value = area.name;
        desc.value = area.description;
        wiki.value = area.wiki;
        setSelectMenuValue("areaType", area.type);
        loadmap(area.dimension, "area")
        document.getElementById("createArea").classList.remove("hidden");
        area.bounds.forEach((e) => {
            updateAreaPreview(L.latLng(e[0], e[1]))
            // Add coords in :)
            document.getElementById("areaVertices").innerHTML += `<div class="coordSet">
                        <div class="input-group">
                            <span class="input-group-text">Coords</span>
                            <input type="number" placeholder="X Coord" aria-label="X" value="${metersToPixels(e[1])}" class="form-control areaVertexX">
                            <input type="number" placeholder="Z Coord" aria-label="Z" value="${metersToPixels(e[0])}" class="form-control areaVertexZ">
                            <button class="btn btn-outline-danger" type="button" id="delBtn" onclick="this.parentNode.parentNode.remove();updateAreaPreview(null,L.latLng(${e[0]}, ${e[1]}))"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>`;
        });

        editModal.hide();

        // Stuff to do on submit...
        document.getElementById("addAreaToMap").addEventListener("click", async () => {
            if (image.files[0]) {
                console.log(image.files[0])
                if (["image/png", "image/jpeg", "image/gif"].includes(image.files[0].type)) {
                    document.getElementById("areaError").innerText = "Uploading Image.."
                    let imgtext = await image.files[0]
                    console.log(imgtext)
                    let imgres = await fetch("/api/v1/create/mediaupload/" + localStorage.getItem("localuuid"), {
                        body: imgtext,
                        headers: {
                            "Content-Type": image.files[0].type,
                            "authorization": localStorage.getItem("sessionToken")
                        },
                        method: "POST"
                    });
                    if (imgres.status == 200) {
                        let jsonurl = await imgres.json();
                        imgurl = jsonurl.url;
                    } else {
                        return document.getElementById("areaError").innerText = await imgres.text();
                    }
                } else {
                    return document.getElementById("areaError").innerText = "Invalid file type."
                }
            }
            document.getElementById("areaError").innerText = "Adding to database...";
            if (!name.value || !desc.value || !type.value) {
                return document.getElementById("areaError").innerText = "You're missing some info. We require: Name, Coordinates, Description, Type."
            } else {
                let newcoords = [];
                let newx = [];
                let newy = [];
                for (const set of previewCoords) {
                    newcoords.push([set.lat, set.lng])
                    newx.push(set.lat);
                    newy.push(set.lng);
                }

                function polygonArea(X, Y, numPoints) {
                    area = 0;         // Accumulates area in the loop
                    j = numPoints - 1;  // The last vertex is the 'previous' one to the first

                    for (i = 0; i < numPoints; i++) {
                        area = area + (X[j] + X[i]) * (Y[j] - Y[i]);
                        j = i;  //j is previous vertex to i
                    }
                    return area / 2;
                }

                let areaArea = polygonArea(newx, newy, previewCoords.length);

                let body = {
                    uuid: localStorage.getItem("localuuid"),
                    sessionToken: localStorage.getItem("sessionToken"),
                    dimension: dimension,
                    name: name.value,
                    bounds: newcoords,
                    wiki: wiki.value,
                    description: desc.value,
                    image: imgurl,
                    type: type.value,
                    size: areaArea,
                    x: polygon.getBounds().getCenter().lng,
                    z: polygon.getBounds().getCenter().lat
                }

                fetch("/api/v1/edit/area/" + id, {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: { "Content-Type": "application/json" }
                }).then(async (res) => {
                    let result = await res.json()
                    if (result.status == "OK") window.location.href = `/`
                    if (result.status == "NotOK") document.getElementById("areaError").innerHTML = result.error;
                })
            }
        });

    } else {
        // We are creating...
        loadmap(dimension, "area");
        templatemodal.hide()
        loginmodal.hide();
        document.getElementById("createArea").classList.remove("hidden");
        document.getElementById("addAreaToMap").addEventListener("click", async () => {
            if (image.files[0]) {
                console.log(image.files[0])
                if (["image/png", "image/jpeg", "image/gif"].includes(image.files[0].type)) {
                    document.getElementById("areaError").innerText = "Uploading Image.."
                    let imgtext = await image.files[0]
                    console.log(imgtext)
                    let imgres = await fetch("/api/v1/create/mediaupload/" + localStorage.getItem("localuuid"), {
                        body: imgtext,
                        headers: {
                            "Content-Type": image.files[0].type,
                            "authorization": localStorage.getItem("sessionToken")
                        },
                        method: "POST"
                    });
                    if (imgres.status == 200) {
                        let jsonurl = await imgres.json();
                        imgurl = jsonurl.url;
                    } else {
                        return document.getElementById("areaError").innerText = await imgres.text();
                    }
                } else {
                    return document.getElementById("areaError").innerText = "Invalid file type."
                }
            }
            document.getElementById("areaError").innerText = "Adding to database...";
            if (!name.value || !desc.value || !type.value) {
                return document.getElementById("areaError").innerText = "You're missing some info. We require: Name, Coordinates, Description, Type."
            } else {
                let newcoords = [];
                let newx = [];
                let newy = [];
                for (const set of previewCoords) {
                    newcoords.push([set.lat, set.lng])
                    newx.push(set.lat);
                    newy.push(set.lng);
                }

                function polygonArea(X, Y, numPoints) {
                    area = 0;         // Accumulates area in the loop
                    j = numPoints - 1;  // The last vertex is the 'previous' one to the first

                    for (i = 0; i < numPoints; i++) {
                        area = area + (X[j] + X[i]) * (Y[j] - Y[i]);
                        j = i;  //j is previous vertex to i
                    }
                    return area / 2;
                }

                let areaArea = polygonArea(newx, newy, previewCoords.length);

                let body = {
                    uuid: localStorage.getItem("localuuid"),
                    sessionToken: localStorage.getItem("sessionToken"),
                    area: {
                        dimension: dimension,
                        name: name.value,
                        bounds: newcoords,
                        wiki: wiki.value,
                        description: desc.value,
                        image: imgurl,
                        type: type.value,
                        size: areaArea,
                        x: polygon.getBounds().getCenter().lng,
                        z: polygon.getBounds().getCenter().lat
                    }
                }

                fetch("/api/v1/create/area", {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: { "Content-Type": "application/json" }
                }).then(async (res) => {
                    let result = await res.json()
                    if (result.status == "OK") window.location.href = `/`
                    if (result.status == "NotOK") document.getElementById("areaError").innerHTML = result.error;
                })
            }
        });
    }
}

// Sets up stuff to create a new location
async function newLocation(dimension, id) {
    let name = document.getElementById("placeName"),
        x = document.getElementById("placeX"),
        z = document.getElementById("placeZ"),
        desc = document.getElementById("placeDesc"),
        wiki = document.getElementById("placeWiki"),
        creator = document.getElementById("placeCreator"),
        month = document.getElementById("placeMonth"),
        year = document.getElementById("placeYear"),
        type = document.getElementById("placeType"),
        portal = document.getElementById("placePortal"),
        echest = document.getElementById("placeChest"),
        public = document.getElementById("placePublic"),
        image = document.getElementById("placeImage"),
        historical = document.getElementById("placeHistorical"),
        imgurl;
    if (id) {
        // We edit the place
        let place = await (await fetch("/api/v1/fetch/places/byid/" + id)).json();
        if (!place) return document.getElementById("editModalFooter").innerText = "Couldn't find a location with that ID."

        // Set above params with values
        name.value = place.name;
        x.value = place.x;
        z.value = place.z;
        desc.value = place.description;
        wiki.value = place.wiki;
        creator.value = place.createdBy;
        let createdDate = new Date(place.dateCreated);
        month.value = createdDate.getMonth();
        year.value = createdDate.getFullYear();
        setSelectMenuValue("placeType", place.type);
        if(place.features.portal) portal.setAttribute("checked", "true");
        if(place.features.echest) echest.setAttribute("checked", "true");
        if(place.features.historical) historical.setAttribute("checked", "true");
        if(place.features.public) public.setAttribute("checked", "true");
        
        loadmap(place.dimension, "place")
        editModal.hide();
        document.getElementById("createPlace").classList.remove("hidden");
        document.getElementById("addPlaceToMap").addEventListener("click", async () => {
            document.getElementById("placeError").innerText = "Adding to database...";
            if (!name.value || !x.value || !z.value || !desc.value || !type.value) {
                return document.getElementById("placeError").innerText = "You're missing some info. We require: Name, Coordinates, Description, Type."
            } else {
                if (image.files[0]) {
                    console.log(image.files[0])
                    if (["image/png", "image/jpeg", "image/gif"].includes(image.files[0].type)) {
                        document.getElementById("placeError").innerText = "Uploading Image.."
                        let imgtext = await image.files[0]
                        console.log(imgtext)
                        let imgres = await fetch("/api/v1/create/mediaupload/" + localStorage.getItem("localuuid"), {
                            body: imgtext,
                            headers: {
                                "Content-Type": image.files[0].type,
                                "authorization": localStorage.getItem("sessionToken")
                            },
                            method: "POST"
                        });
                        if (imgres.status == 200) {
                            let jsonurl = await imgres.json();
                            imgurl = jsonurl.url;
                        } else {
                            return document.getElementById("placeError").innerText = await imgres.text();
                        }
                    } else {
                        return document.getElementById("placeError").innerText = "Invalid file type."
                    }
                }
                let d = new Date(0)
                d.setMonth(month.value)
                d.setFullYear(year.value)
                let created = d.toISOString()
                let body = {
                    uuid: localStorage.getItem("localuuid"),
                    sessionToken: localStorage.getItem("sessionToken"),
                    place: {
                        name: name.value,
                        x: x.value,
                        z: z.value,
                        wiki: wiki.value,
                        createdBy: creator.value,
                        dateCreated: created,
                        description: desc.value,
                        images: imgurl,
                        type: type.value,
                        features: {
                            portal: portal.checked,
                            echest: echest.checked,
                            historical: historical.checked,
                            public: public.checked
                        }
                    }
                }
                fetch("/api/v1/edit/place/" + id, {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: { "Content-Type": "application/json" }
                }).then(async (res) => {
                    let result = await res.json()
                    if (result.status == "OK") window.location.href = `/?x=${x.value}&z=${z.value}&dimension=${dimension}`
                })
            }
        });
    } else {
        // We create the place
        loadmap(dimension, "place")
        templatemodal.hide()
        loginmodal.hide();
        document.getElementById("createPlace").classList.remove("hidden");
        document.getElementById("addPlaceToMap").addEventListener("click", async () => {
            document.getElementById("placeError").innerText = "Adding to database...";
            if (!name.value || !x.value || !z.value || !desc.value || !type.value) {
                return document.getElementById("placeError").innerText = "You're missing some info. We require: Name, Coordinates, Description, Type."
            } else {
                if (image.files[0]) {
                    console.log(image.files[0])
                    if (["image/png", "image/jpeg", "image/gif"].includes(image.files[0].type)) {
                        document.getElementById("placeError").innerText = "Uploading Image.."
                        let imgtext = await image.files[0]
                        console.log(imgtext)
                        let imgres = await fetch("/api/v1/create/mediaupload/" + localStorage.getItem("localuuid"), {
                            body: imgtext,
                            headers: {
                                "Content-Type": image.files[0].type,
                                "authorization": localStorage.getItem("sessionToken")
                            },
                            method: "POST"
                        });
                        if (imgres.status == 200) {
                            let jsonurl = await imgres.json();
                            imgurl = jsonurl.url;
                        } else {
                            return document.getElementById("placeError").innerText = await imgres.text();
                        }
                    } else {
                        return document.getElementById("placeError").innerText = "Invalid file type."
                    }
                }
                let d = new Date(0)
                d.setMonth(month.value)
                d.setFullYear(year.value)
                let created = d.toISOString()
                let body = {
                    uuid: localStorage.getItem("localuuid"),
                    sessionToken: localStorage.getItem("sessionToken"),
                    place: {
                        dimension: dimension,
                        name: name.value,
                        x: x.value,
                        z: z.value,
                        wiki: wiki.value,
                        createdBy: creator.value,
                        dateCreated: created,
                        description: desc.value,
                        images: imgurl,
                        type: type.value,
                        features: {
                            portal: portal.checked,
                            echest: echest.checked,
                            historical: historical.checked,
                            public: public.checked
                        }
                    }
                }
                fetch("/api/v1/create/place", {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: { "Content-Type": "application/json" }
                }).then(async (res) => {
                    let result = await res.json()
                    if (result.status == "OK") window.location.href = `/?x=${x.value}&z=${z.value}&dimension=${dimension}`
                })
            }
        });
    }
    // Here's all the info they can input

    /*
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });

    image.addEventListener("change", async () => {
        document.getElementById("placeError").innerText = ""
        if (image.files[0]) {
            if (image.files[0].size > 5000000) {
                return document.getElementById("placeError").innerText = "We only accept images smaller than 5MB. Sorry!"
            } else {
                imgurl = await toBase64(image.files[0])
            }
        }
    })*/

    
}

let chooseRemoveModal = new bootstrap.Modal("#chooseremove");
let areyousureModal = new bootstrap.Modal("#areyousure")
let idToRemove;
function removeAPlace() {
    templatemodal.hide()
    loginmodal.hide();
    chooseRemoveModal.show();
}

async function getPlaceToRemove() {
    let id = document.getElementById("removeID").value;
    idToRemove = id;
    let resulttext = document.getElementById("findResult");
    if(id.toLowerCase().startsWith("a")) {
        let area = await (await fetch("/api/v1/fetch/area/byid/" + id.substring(1))).json();
        if(!area) resulttext.innerHTML = `No areas found with that ID.`
        resulttext.innerHTML = `Remove <strong>${area.name}</strong>? <button class="btn btn-danger btn-sm" onclick="proceedWithRemoval()" id="proceedDeleteBtn">Proceed</button>`
    } else if(id.toLowerCase().startsWith("p")) {
        let place = await (await fetch("/api/v1/fetch/places/byid/" + id.substring(1))).json();
        if(!place) resulttext.innerHTML = `No areas found with that ID.`
        resulttext.innerHTML = `Remove <strong>${place.name}</strong>? <button class="btn btn-danger btn-sm" onclick="proceedWithRemoval()" id="proceedDeleteBtn">Proceed</button>`
    } else {
        resulttext.innerHTML = `Invalid ID.`
    }
}

function proceedWithRemoval() {
    chooseRemoveModal.hide();
    areyousureModal.show();
}

async function yesiamsure() {
    let response = await (await fetch("/api/v1/delete/" + idToRemove, {
        method: "POST",
        body: JSON.stringify({session: localStorage.getItem("sessionToken"), uuid: localStorage.getItem("localuuid")}),
        headers: {"Content-Type": "application/json"}
    })).json();
    document.getElementById("removalStatusText").innerText = response.status == "OK" ? response.message + " Redirecting in 5s..." : response.error;
    if(response.status == "OK") {
        setTimeout(() => {
            window.location.reload()
        }, 6000)
    }
}