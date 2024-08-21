document.querySelector("#register").addEventListener("click", async (e) => {
    //await grecaptcha.execute();
    let username = document.querySelector("#username").value,
        password = document.querySelector("#password").value,
        passwordAgain = document.querySelector("#passwordAgain").value,
        error = document.querySelector("#error"),
        x = document.querySelector("#x"),
        z = document.querySelector("#z"),
        usernameToVerify = document.querySelector("#usernameToVerify"),
        strategy = document.querySelector("#strategy");
    error.setAttribute("style", "");
    error.innerHTML = "Loading..."
    if(!username || !password || !passwordAgain) {
        
        error.setAttribute("style", "color: red;")
        error.innerHTML = "Please fill *all* of the fields :)";
    } else if(password != passwordAgain) {
        
        error.setAttribute("style", "color: red;")
        error.innerHTML = "Your passwords don't match. Try that again maybe?"
    } else {
        let response = await grecaptcha.getResponse();
        console.log(response)
        let tosend = {
            username: username,
            password: password,
            captcha: response
        }
        let res = await (await fetch("/api/v1/signup/creation", {
            method: "POST",
            body: JSON.stringify(tosend),
            headers: { "Content-Type": "application/json" }
        })).json();
        if(res.error) {
            error.setAttribute("style", "color: red;")
            return error.innerHTML = res.error;
        } else {
            usernameToVerify.innerHTML = username;
            x.innerHTML = res.coords[0];
            z.innerHTML = res.coords[1];
            if(res.strategy == "nearby") {
                strategy.innerHTML = "in a place nearby to you";
            } else {
                strategy.innerHTML = "someone in the map's central area";
            }
            document.querySelector('#verify').setAttribute('style', 'height: 100dvh;');
            document.querySelector('#signup').setAttribute('style', 'display:none;')
        }
    }
});

document.querySelector("#verifyButton").addEventListener("click", async () => {
    let res = await(await fetch("/api/v1/signup/check?username=" + document.querySelector("#username").value)).json();
    if(res.error) {
        document.querySelector("#error2").innerHTML = res.error;
    } else if(res.status == "success") {
        localStorage.setItem("sessionToken", res.sessionToken);
        localStorage.setItem("sessionExpiry", res.expires);
        localStorage.setItem("localuuid", res.uuid);
        window.location.href = "/"
    }
})