const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// === التوكنات والإعدادات الخاصة بيك ===
const PAGE_TOKEN = "EAAWnmIoxGbYBQF3xfUQohqSOFL8aPjHAj5ZB5qGQY0swYZCBIfXuOeXSgKANnFhyHMMMnUKFzQqWEzDJat6MkTwZBUAloFbnvfPVppXs4vxFZBF1dJt3odmazZBOfh2BIQU94aJu6URQmRAywRcbuzGA8jx800xcjkx6f6edgFTuN8YiXeaEZA3wMZAyEOZA1LiNG4PZAJwE0";
const BOT_TOKEN  = "EAAPMZAKDm1bIBQKW6vlpCuOkW0mjJZAB0gKakdsINmRUCfQbecBC01m0lwld415ZCiXXBt1Lj8SMgruC6g99U6xZB0wVQiYRZCYuMZCd1hZAxOkBYD3gCEhkKPvV1oGALPRTJH44sOjDgNCQ6iQY8o2eQfvZAl17Lf4JJ970ZAMYaW1dS0IpuXztrkvtpjeR8qZBYwwHXHpWUIEQZDZD";
const VERIFY_TOKEN = "idriss123";
const PAGE_ID = "677350272129865";

// Webhook Verification
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Wrong token');
  }
});

// استقبال الرسائل
app.post('/webhook', async (req, res) => {
  let body = req.body;

  if (body.object === 'page') {
    for (let entry of body.entry) {
      for (let event of entry.messaging) {
        if (event.message && event.message.text) {
          let text = event.message.text.trim();

          if (text.includes('vid3rb.com') || text.includes('video.vid3rb.com')) {
            sendTyping(event.sender.id, true);
            await handleVid3rbLink(event.sender.id, text);
            sendTyping(event.sender.id, false);
          }
        }
      }
    }
    res.status(200).send('OK');
  } else {
    res.sendStatus(404);
  }
});

// استخراج الرابط المباشر من vid3rb
async function getVid3rbDirectLink(pageUrl) {
  try {
    const { data } = await axios.get(pageUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const match = data.match(/"src":"(.*?)"/);
    if (match && match[1]) {
      return match[1].replace(/\\/g, '');
    }
    return null;
  } catch (e) {
    return null;
  }
}

// التعامل مع الرابط
async function handleVid3rbLink(senderId, url) {
  try {
    sendMessage(senderId, "لحظة... بجيب الرابط المباشر");

    const directLink = await getVid3rbDirectLink(url);
    if (!directLink) {
      return sendMessage(senderId, "معرفتش أجيب الرابط المباشر، جرب رابط تاني");
    }

    sendMessage(senderId, "تمام، بدأت التحميل (ممكن ياخد من 30 ثانية لـ 5 دقايق حسب الحجم)");

    const filePath = '/tmp/episode.mp4';
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
      url: directLink,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'Referer': 'https://vid3rb.com/',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 300000 // 5 دقايق
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    sendMessage(senderId, "تم التحميل بنجاح!\nجاري الرفع على الصفحة...");

    // رفع الفيديو على الصفحة
    const form = new FormData();
    form.append('access_token', PAGE_TOKEN);
    form.append('message', 'حلقة جديدة');
    جاهزة للمشاهدة');
    form.append('source', fs.createReadStream(filePath));

    const uploadRes = await axios.post(
      `https://graph-video.facebook.com/v20.0/${PAGE_ID}/videos`,
      form,
      { headers: form.getHeaders(), timeout: 600000 }
    );

    const postLink = `https://www.facebook.com/\( {PAGE_ID}_ \){uploadRes.data.id}`;

    sendMessage(senderId, `تم النشر بنجاح!\n\n${postLink}`);

    // حذف الملف
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error(err);
    sendMessage(senderId, "حصل خطأ أثناء التحميل أو الرفع، جرب تاني بعد شوية");
  }
}

// إرسال رسالة
function sendMessage(recipientId, text) {
  axios.post('https://graph.facebook.com/v20.0/me/messages', {
    recipient: { id: recipientId },
    message: { text },
    access_token: BOT_TOKEN
  }).catch(() => {});
}

// مؤشر الكتابة
function sendTyping(recipientId, on) {
  axios.post('https://graph.facebook.com/v20.0/me/messages', {
    recipient: { id: recipientId },
    sender_action: on ? "typing_on" : "typing_off"
  }, { params: { access_token: BOT_TOKEN } });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`البوت شغال الآن على البورت ${PORT}`);
  console.log(`رابط الويب هوك: https://${process.env.RAILWAY_STATIC_URL || 'your-app.up.railway.app'}/webhook`);
});
