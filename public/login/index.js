document.querySelector("#login").addEventListener("click", async () => {
    let username = document.getElementById("username").value,
        password = document.getElementById("password").value,
        error = document.getElementById("error");

        let res = await (await fetch("/api/v1/login", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
                username: username,
                password: password
            })
        })).json();

        if(res.error) {
            error.innerHTML = res.error;
        } else if(res.status == "success") {
            localStorage.setItem("sessionToken", res.token);
            localStorage.setItem("sessionExpiry", res.expiry);
            localStorage.setItem("localuuid", res.uuid);
            window.location.href = "/";
        }
})