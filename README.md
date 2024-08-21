Welcome to the Github Repo for the PVC Mapper! 👋

### Running the PVC Mapper on your own:

Prerequisites: Google recaptcha key (For "I'm not a robot"), Discord webhook URL (to receive place deletion requests), loads of map tiles :)

1. Install Node.JS & NPM (Should come bundled with node)
2. Create a file called `.env`. Insert the following into it:
```env
GOOGLERECAPTCHAKEY=<Your recaptcha key>
DISCORDWEBHOOKURL=<Your discord webhook url>
```
3. Run `npm install` to install the dependencies for this project
4. In the meantime, create a new file in the `/public` directory called `maps`. Create two directories (`minecraft_overworld` and `minecraft_nether`). You can put your map tiles into these two directories.
5. Run `node index.js`. The server will be hosted at port `3005`. Hooray! 🎉
