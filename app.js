const cors = require("cors");
const express = require("express");
const querystring = require("querystring");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const line = require("@line/bot-sdk");
const serviceAccount = require("./config/serviceAccountKey.json");

const PORT = process.env.PORT || 3000;

const LINE_PROFILE_ENDPOINT = "https://api.line.me/v2/profile";
const LINE_TOKEN_ENDPOINT = "https://api.line.me/oauth2/v2.1/token";
const LINE_AUTH_ENDPOINT = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_CHANNEL_ACCESS_TOKEN =
  "LHC2yeaIoQy1lzybIRYKq+OxUlf+zzZGdgdRo939F1BRq3ompxyDBcySyzoIgaMP+gRpAH6dMje0wffBucFwrg9GwYp+UMWybJLOrcOhXB86slvSlzzkx2i0BRo+zU6PqGV9w/wGsWicAYNxwZG5uwdB04t89/1O/w1cDnyilFU=";
const LINE_CHANNEL_SECRET = "2e200fa7c2d3f0e18512a722960419e0";
const LINE_LOGIN_CLIENTID = "1603323494";
const LINE_LOGIN_SECRET = "9385d851d92b5139881d749c7c3851d5";

const lineClientSDKConfig = {
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: LINE_CHANNEL_SECRET
};

// Init and create LINE SDK client
const lineClient = new line.Client(lineClientSDKConfig);

// 用accessToken向LINE 取得 User Profile
const getLineUserProfile = accessToken => {
  // documentation: https://developers.line.me/en/docs/social-api/getting-user-profiles/
  console.log("REQUEST PROFILE with TOKEN:", accessToken);
  return axios.get(LINE_PROFILE_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
};

const getShortenUrl = (long_url, title) => {
  const bitlyEndpoint = "https://api-ssl.bitly.com/v4/bitlinks";
  return axios.post(
    bitlyEndpoint,
    {
      group_guid: BITLY_GROUPID,
      long_url,
      title: title || ""
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITLY_TOKEN}`
      }
    }
  );
};

const getLineLoginRegUrl = (state, nonce) => {
  //https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=1602410542&redirect_uri=https://us-central1-kingsteel-unify-api.cloudfunctions.net/io/line/login/callback&state=0710&scope=openid%20email%20profile&bot_prompt=normal&nonce=簡光正
  const redirect_uri =
    "https://us-central1-kingsteel-unify-api.cloudfunctions.net/io/line/login/callback";
  return `${LINE_AUTH_ENDPOINT}?response_type=code&client_id=${LINE_LOGIN_CLIENTID}&redirect_uri=${redirect_uri}&state=${state}&scope=openid%20email%20profile&bot_prompt=normal&nonce=${nonce}`;
};

// Event types:
// message, follow, unfollow, join, leave, postback, beacon, accountLink
const LineEventHub = (event, employee) => {
  switch (event.type) {
    case "message":
      // Get message and reply token from line request object
      // Handle all types of message
      // message has 7 types: text, image, video, audio, file, location, sticker
      // Return promise
      return handleMessageEvent(event, employee);

    case "postback":
      return handlePostbackEvent(event, employee);
    //return Promise.resolve();

    case "follow":
      //handleFollowEvent(event);
      return Promise.resolve();

    case "unfollow":
    case "join":
    case "leave":
    case "accountLink":
    case "beacon":
      return Promise.resolve();

    default:
      return Promise.resolve();
  }
};

// Handle Message event
// message event has 7 types:
// text, image, video, audio, file, location, sticker
const handleMessageEvent = (event, employee) => {
  switch (event.message.type) {
    // Handle all text type messages here
    case "text":
      // Return Promise
      return handleTextMessage(event, employee);

    case "image": // Handle images
    //return handleImageMessage(event, employee);

    case "video":

    case "audio":

    case "file":

    case "location":

    case "sticker":

    default:
      //sendReplyText(replyToken, `目前只支援純文字指令`);
      return Promise.resolve();
  }
};

// Handle Follow event
const handleFollowEvent = event => {
  const { replyToken } = event;
  const { userId } = event.source;

  /*  client
    .getProfile(userId)
    .then(profile => {
      if (isAuthedUser) {
        sendReplyText(replyToken, `${isAuthedUser.name} 你好，歡迎使用本系統`);
        notifyAdmins(
          ADMIN_UID,
          `認證完成的使用者 ${isAuthedUser.name}-${profile.displayName}(ID:${
            profile.userId
            }) 加入好友`
        );
      } else {
        sendReplyText(
          replyToken,
          `${profile.displayName} 你好，本系統需通過認證程序才能使用，謝謝`
        );

        notifyAdmins(
          ADMIN_UID,
          `未經認證使用者 ${profile.displayName}(ID:${profile.userId}) 加入好友`
        );
      }
    })
    .catch(error => {
      context.log('Handle follow event error:', error);
    });*/
};

// Handle Postback event
const handlePostbackEvent = (event, employee) => {
  // Get and parse postback data
  const postbackData = querystring.parse(event.postback.data);
  const { replyToken } = event;
  let replyMessageDeck = [];

  switch (postbackData.action) {
    case "overtime":
      const defaultMessageText = `${employee.Name} ${
        employee.Title
      } 系統已受理你的加班確認，謝謝！`;
      replyMessageDeck.push({ type: "text", text: defaultMessageText });
      break;

    default:
      replyMessageDeck.push({ type: "text", text: defaultMessageText });
      break;
  }

  return lineClient.replyMessage(replyToken, replyMessageDeck);
};

/* --- Message Handler --- */
// Handle text message
// Return Promise
const handleTextMessage = (event, employee) => {
  const { message, replyToken } = event;
  const defaultMessageText = `${employee.Name} ${employee.Title} 收到你的訊息:${
    message.text
  }`;

  let replyMessageDeck = [];

  // Message factory
  switch (message.text) {
    case "加班":
      // XXX 你好，今天確認要加班？
      let messageText = `${employee.Name}${
        employee.Title
      }你好，確認今天要加班？`;
      let confirmMessage = {
        type: "template",
        altText: "加班確認",
        template: {
          type: "confirm",
          text: messageText,
          actions: [
            {
              type: "postback",
              label: "確認加班",
              data: `action=overtime&employeeID=${employee.EmployeeID}`,
              displayText: "系統確認中，謝謝"
            },
            {
              type: "message",
              label: "不是",
              text: "no"
            }
          ]
        }
      };
      replyMessageDeck.push(confirmMessage);
      break;

    default:
      replyMessageDeck.push({ type: "text", text: defaultMessageText });
      break;
  }

  return lineClient.replyMessage(replyToken, replyMessageDeck);
};

// Handle image message
const handleImageMessage = event => {
  const { message, replyToken, source } = event;
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://estu-volunteer-management.firebaseio.com"
});

// Firestore init and setting
const firestore = admin.firestore();
firestore.settings({ timestampsInSnapshots: true });

const app = express();
// Express Middleware section
app.use(cors({ origin: true }));

app.get("/", (req, res) => res.send("Hello World!"));

// Create a Router for '/line/*'
let lineRouter = express.Router();

/*
 * /line/messaging/webhook
 * /line/login/callback
 * Testing URL:
 * https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=1602410542&redirect_uri=https://us-central1-kingsteel-unify-api.cloudfunctions.net/io/line/login/callback&state=0710&scope=openid%20email%20profile&bot_prompt=normal&nonce=簡光正
 */
lineRouter.get("/login/callback", (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error || error_description) {
    return res.send(error_description);
  }

  if (code && state) {
    // 從LINE回傳的結果，取得state，理論上就是工號，4碼 0002 ～ 1999
    let employee = {};
    // payload 是要放到 Firestore 的資料
    let payload = {};

    // Get Employee data, terminate if employee not exists
    firestore
      .doc(`employees/${state}`)
      .get()
      .then(doc => {
        if (!doc.exists) {
          return res.status(201).send("No such employee");
        } else {
          // Get employee data
          employee = doc.data();
          console.log("Find employee:", employee);
          // Body for request Line access token
          const requestBody = {
            grant_type: "authorization_code",
            code,
            redirect_uri: `https://${req.hostname}/io/line/login/callback`,
            client_id: LINE_LOGIN_CLIENTID,
            client_secret: LINE_LOGIN_SECRET
          };
          const data = querystring.stringify(requestBody);
          const options = {
            headers: { "content-type": "application/x-www-form-urlencoded" }
          };

          return axios.post(LINE_TOKEN_ENDPOINT, data, options);
        }
      })
      .then(token => {
        // Get Line User Profile data with response access token
        // There are 6 objects with response
        // access_token, expires_in, id_token, refresh_token, scope, token_type
        console.log("Get Token", token.data);
        const { access_token, id_token } = token.data;

        payload["Line"] = {};

        // Saving state and  code from query string
        payload.Line["state"] = state;
        payload.Line["code"] = code;

        // Save Raw data
        payload.Line["RawRequest"] = token.data;

        // Save id_token to payload
        payload.Line["IDToken"] = id_token;
        payload.Line["IDTokenDecode"] = jwt.decode(id_token);

        // getLineUserProfile will return a promise with profile data
        return getLineUserProfile(access_token);
      })
      .then(profile => {
        //Add uid for quick search and match
        // Get LINE user profile success save it to payload
        console.log("Get LINE profile", profile.data);
        payload.Line["uid"] = profile.data.userId;
        payload.Line["Profile"] = profile.data;

        // Create a Firebase token with LINE user ID
        return admin.auth().createCustomToken(profile.data.userId);
      })
      .then(fbToken => {
        console.log("Get Firebase Token", fbToken);
        payload["Firebase"] = {};
        // Save firebase custom token
        payload.Firebase["Token"] = fbToken;
        payload.Firebase["TokenDecode"] = jwt.decode(fbToken);
        // Save timestamp for created
        payload.Line["registeredAt"] = new Date();

        // TODO: 登入/建立 Firebase帳號
        // 存到Firestore /employees collection
        return firestore
          .doc(`/employees/${state}`)
          .set(payload, { merge: true });
      })
      .then(() => {
        // Send line push message to user
        console.log("Push message", employee);
        const { Name, Title } = employee;
        lineClient.pushMessage(payload.Line.uid, [
          {
            type: "text",
            text: `${Name} ${Title}你好，你已成功註冊KS鉅鋼員工智助服務系統！`
          }
        ]);

        // redirect 到認證成功的網頁
        //https://kingsteel-unify-api.firebaseapp.com/0710
        return res.redirect(
          `https://kingsteel-unify-api.firebaseapp.com/${state}`
        );
        //return res.status(200).send('Registered OK!');
      })
      .catch(error => {
        console.log("ERROR:", error);
        return res.status(401).send(error);
      });
  } else {
    return res.status(200).send("CODE AND STATE NOT FOUND");
  }
});

// Line Messaging Bot Webhook Endpoint
lineRouter.post("/bot/webhook", (req, res) => {
  // req.body.events sample:
  // https://developers.line.me/en/reference/messaging-api/#wh-text
  const event = req.body.events[0];
  // Get source from event
  const { source } = event;

  // Accept only user type and registered in employee database
  if (source.type === "user") {
    // Line User ID
    const { userId } = source;

    // Check if user exists and registered
    firestore
      .collection(`employees`)
      .where("Line.uid", "==", userId)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          // 取出第一筆，通常也只會有一筆
          const employee = snapshot.docs[0].data();
          // 把event跟employee資料傳給EventHub
          LineEventHub(event, employee)
            .then(() => res.status(200).send())
            .catch(error => res.status(400).send(error));
        } else {
          // 非登記註冊的使用者, 回傳警告訊息
          lineClient
            .replyMessage(event.replyToken, {
              type: "text",
              text: `你未註冊使用本系統，請洽本公司資訊人員，謝謝`
            })
            .then(() => res.status(200).send());
        }
      })
      .catch(error => res.status(400).send(error));
  } else {
    // type === 'group'
    // type === 'room'
    return res.status(200).send();
  }
});

app.listen(PORT, () => console.log("Example app listening on port 3000!"));
