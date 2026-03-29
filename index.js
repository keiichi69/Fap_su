require('dotenv').config(); // Bùa chú giấu Token
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');

// --- 1. MÁY THỞ CHO RENDER (Chống ngủ 24/7) ---
const app = express();
app.get('/', (req, res) => res.send('Kế toán Địa Đạo đang online và giữ tiền của anh em!'));
app.listen(process.env.PORT || 3000, () => console.log('[Web] Đã bật máy thở trên port 3000'));

// --- 2. KHỞI TẠO BOT ---
const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]
});

// --- 3. KẾT NỐI MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('[HỆ THỐNG] Đã kết nối kho tiền MongoDB thành công!'))
    .catch(err => console.error('[LỖI] Không thể kết nối MongoDB:', err));

// Tạo khuôn mẫu sổ nợ trên mây
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    money: { type: Number, default: 0 },
    lastDaily: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

client.once('ready', () => {
    console.log(`[THÀNH CÔNG] Kế toán ${client.user.tag} đã chính thức mở sòng bạc Địa Đạo!`);
});

// --- 4. HỆ THỐNG LỆNH ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Lấy prefix từ file .env, nếu quên chưa cài thì mặc định là 'f!'
    const prefix = process.env.PREFIX || 'f!';
    if (!message.content.startsWith(prefix)) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // Tự động kiểm tra và tạo ví trên MongoDB cho người nhắn
    let userData = await User.findOne({ userId });
    if (!userData) userData = await User.create({ userId });

    // ----- LỆNH NHẬN LƯƠNG HÀNG NGÀY -----
    if (command === 'daily' || command === 'work') {
        const cooldownTime = 86400000; // 24 giờ
        const now = Date.now();

        if (now - userData.lastDaily < cooldownTime) {
            const timeLeft = cooldownTime - (now - userData.lastDaily);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply(`Định bòn rút ngân sách à? Phải đợi **${hours} giờ ${minutes} phút** nữa mới được nhận tiếp em nhé!`);
        }

        const luong = Math.floor(Math.random() * 100) + 1000; 
        userData.money += luong; 
        userData.lastDaily = now; 
        
        await userData.save(); // Lưu lên mây
        message.reply(`Bạn vừa điểm danh thành công và nhận được **${luong} đồng**. Số dư: **${userData.money} đồng**.`);
    }

    // ----- LỆNH XEM VÍ -----
    if (command === 'bal') {
        message.reply(`Ví của bạn đang có: **${userData.money} đồng**. Đi làm chăm chỉ hoặc chơi game để kiếm thêm tiền nhé!`);
    }

    // ----- LỆNH ĂN CƯỚP (Luật Gắt) -----
    if (command === 'rob') {
        const victim = message.mentions.users.first(); 
        if (!victim) return message.reply("Bạn định cướp không khí à? Phải tag một người vào! Ví dụ: `f!rob @ai_đó`");
        if (victim.id === userId) return message.reply("Bạn không thể tự cướp chính mình!");
        if (victim.bot) return message.reply("Tha cho bot đi bạn ơi,em nó làm gì có tiền mà cướp!");

        // Lấy dữ liệu nạn nhân từ mây
        let victimData = await User.findOne({ userId: victim.id });
        if (!victimData) victimData = await User.create({ userId: victim.id });

        if (victimData.money < 100) return message.reply("Đối tượng này quá nghèo, cướp họ mang nghiệp đấy, tha đi!");
        
        const percent = (Math.floor(Math.random() * 21) + 10) / 100;
        const tienDinhCuop = Math.floor(victimData.money * percent);
        const tienPhat = Math.floor(tienDinhCuop * 0.9);

        if (userData.money < tienPhat) return message.reply(`Để cướp người này, bạn cần ít nhất **${tienPhat} đồng** trong ví (để phòng nộp phạt nếu bị tóm). Hiện tại bạn không đủ!`);

        const isSuccess = Math.random() < 0.4;
        
        if (isSuccess) {
            victimData.money -= tienDinhCuop;
            userData.money += tienDinhCuop;
            await victimData.save();
            await userData.save();
            message.reply(`Ngon lành! Bạn vừa móc túi ${victim.username} hốt trọn **${tienDinhCuop} đồng**. Chạy mau trước khi cảnh sát tóm!!`);
        } else {
            userData.money -= tienPhat;
            victimData.money += tienPhat;
            await victimData.save();
            await userData.save();
            message.reply(`Úi chà! Bạn thò tay vào túi ${victim.username} định cướp thì bị tóm. Bị ăn 1 chày và nộp phạt **${tienPhat} đồng** cho nạn nhân!`);
        }
    }

    // ----- LỆNH BLACKJACK -----
    if (command === 'bj') {
        const cuoc = parseInt(args[0]); 
        if (!cuoc || isNaN(cuoc) || cuoc <= 0) return message.reply(`Cược bao nhiêu tiền? Gõ: \`${prefix}bj <số_tiền>\``);
        if (userData.money < cuoc) return message.reply(`Ví bạn còn có **${userData.money} đồng**, tiền đâu mà đòi chơi sộp?`);

        // Thu tiền cược ngay
        userData.money -= cuoc;
        await userData.save();

        const getCard = () => {
            const suits = ['♠', '♥', '♦', '♣'];
            const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            const rank = ranks[Math.floor(Math.random() * ranks.length)];
            const suit = suits[Math.floor(Math.random() * suits.length)];
            let value = ['J', 'Q', 'K'].includes(rank) ? 10 : (rank === 'A' ? 11 : parseInt(rank));
            return { rank, suit, value, display: `\`${rank}${suit}\`` };
        };

        const calcScore = (hand) => {
            let score = hand.reduce((a, b) => a + b.value, 0);
            let aces = hand.filter(c => c.rank === 'A').length;
            while (score > 21 && aces > 0) { score -= 10; aces--; }
            return score;
        };

        let pHand = [getCard(), getCard()];
        let dHand = [getCard(), getCard()];

        const makeEmbed = (hideDealer = true, status = '🎲 ~ game in progress') => {
            let dScore = hideDealer ? dHand[0].value : calcScore(dHand);
            let pScore = calcScore(pHand);
            let dDisplay = hideDealer ? `${dHand[0].display} \` 🎴 \`` : dHand.map(c=>c.display).join(' ');
            let pDisplay = pHand.map(c=>c.display).join(' ');

            return new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: `${message.author.username}, you bet ${cuoc} to play blackjack`, iconURL: message.author.displayAvatarURL() })
                .addFields(
                    { name: `Dealer [${hideDealer ? dScore + '+?' : dScore}]`, value: dDisplay, inline: true },
                    { name: `${message.author.username} [${pScore}]`, value: pDisplay, inline: true }
                )
                .setFooter({ text: status });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setEmoji('👊').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stand').setEmoji('🛑').setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({ embeds: [makeEmbed()], components: [row] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: 'Bàn của người ta, đừng có bấm bậy!', ephemeral: true });

            if (i.customId === 'hit') {
                pHand.push(getCard());
                if (calcScore(pHand) > 21) {
                    collector.stop('busted');
                } else {
                    await i.update({ embeds: [makeEmbed()], components: [row] });
                }
            } else if (i.customId === 'stand') {
                collector.stop('stand');
            }
        });

        collector.on('end', async (collected, reason) => {
            let pScore = calcScore(pHand);
            let dScore = calcScore(dHand);
            let resultMsg = '';

            if (reason === 'busted') {
                resultMsg = '💥 BẠN ĐÃ THUA (Vượt quá 21 điểm)! Bớt đỏ đen lại bạn êy!';
            } else {
                while (dScore < 17) { dHand.push(getCard()); dScore = calcScore(dHand); }

                if (dScore > 21 || pScore > dScore) {
                    resultMsg = `🎉 DEALER THUA! Bạn thắng **${cuoc * 2} đồng**!`;
                    userData.money += cuoc * 2;
                } else if (dScore > pScore) {
                    resultMsg = '💸 DEALER THẮNG! Bạn mất sạch tiền cược!';
                } else {
                    resultMsg = '🤝 HÒA! Bạn được hoàn lại tiền cược.';
                    userData.money += cuoc;
                }
            }
            
            await userData.save(); // LƯU KẾT QUẢ CUỐI CÙNG LÊN MÂY

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hit').setEmoji('👊').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('stand').setEmoji('🛑').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await msg.edit({ embeds: [makeEmbed(false, resultMsg)], components: [disabledRow] }).catch(()=>{});
        });
    }

    // ----- LỆNH CỬA HÀNG ROLE -----
    if (command === 'shop') {
        const embed = new EmbedBuilder()
            .setTitle('🛒 Chợ Đen Địa Đạo')
            .setDescription('Dùng tiền tích góp để mua danh hiệu xịn xò nào bạn ơi!\nChọn món đồ bạn muốn mua ở menu bên dưới nhé.')
            .setColor('#7dd4ff')
            .setThumbnail(client.user.displayAvatarURL());

        const select = new StringSelectMenuBuilder()
            .setCustomId('shop_menu')
            .setPlaceholder('Chọn món hàng bạn muốn mua...')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Phắc boiz 😼').setDescription('Giá: 30,000 đồng').setValue('role_phacboiz'),
                new StringSelectMenuOptionBuilder().setLabel('Chúa tể xamlin    🗡').setDescription('Giá: 100,000 đồng').setValue('role_chuatexmlin'),
                new StringSelectMenuOptionBuilder().setLabel('Ma Vương chubby').setDescription('Giá: 250.000').setValue('role_mavuongchubby')
            );

        const row = new ActionRowBuilder().addComponents(select);
        const response = await message.reply({ embeds: [embed], components: [row] });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: 'Đi chỗ khác chơi, Shop này của người ta!', ephemeral: true });

            let price = 0;
            let roleId = '';
            let roleName = '';

            // NHỚ ĐỔI ID ROLE CỦA BẠN VÀO ĐÂY:
            if (i.values[0] === 'role_phacboiz') { price = 30000; roleId = '1131414140372664371'; roleName = 'Đại Gia Địa Đạo'; } 
            else if (i.values[0] === 'role_chuatexmlin') { price = 100000; roleId = '1136322305740521513'; roleName = 'Chúa tể Xamlin'; } 
            else if (i.values[0] === 'role_mavuongchubby') { price = 250000; roleId = '1487855184230224002'; roleName = 'Ma Vương Chubby'; }

            if (userData.money < price) {
                return i.reply({ content: `Chú em quá nghèo,chú em còn thiếu **${price - userData.money} đồng** nữa.`, ephemeral: true });
            }

            if (i.member.roles.cache.has(roleId)) return i.reply({ content: 'Bạn đã sỡ hữu role này,vui lòng chọn role khác!', ephemeral: true });

            try {
                userData.money -= price; 
                await userData.save(); // LƯU VÍ LÊN MÂY

                await i.member.roles.add(roleId); 
                await i.reply({ content: `🎉 Giao dịch thành công! Bạn đã chi **${price} đồng** để mua role **${roleName}**!` });
            } catch (error) {
                console.error(error);
                await i.reply({ content: 'Lỗi rồi! Vui lòng thử lại sau.', ephemeral: true });
            }
        });
    }

    // ==========================================
    // ----- KHU VỰC ĐỘC QUYỀN CHO ADMIN -----
    // ==========================================
    
    // Kiểm tra xem người gõ lệnh có quyền Quản trị viên không
    const isAdmin = message.member.permissions.has('Administrator');

    // 1. Lệnh Bơm Tiền (f!addmoney @user số_tiền)
    if (command === 'addmoney') {
        if (!isAdmin) return message.reply("Bạn không đủ quyền hạn để sử dụng lệnh này!");
        
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]); // Lấy số tiền ở vị trí thứ 2 sau lệnh

        if (!target || isNaN(amount) || amount <= 0) {
            return message.reply(`Gõ sai rồi sếp! Cú pháp chuẩn: \`${prefix}addmoney @ai_đó <số_tiền>\``);
        }

        // Tìm ví của người đó trên mây
        let targetData = await User.findOne({ userId: target.id });
        if (!targetData) targetData = await User.create({ userId: target.id });

        targetData.money += amount;
        await targetData.save(); // Cập nhật lên MongoDB

        message.reply(`💸 **BÙM!** Tổng tài vừa bơm nóng **${amount} đồng** vào két của ${target.username}. Tổng tài sản: **${targetData.money} đồng**.`);
    }

    // 2. Lệnh Tịch Thu Gia Sản (f!resetmoney @user)
    if (command === 'resetmoney') {
        if (!isAdmin) return message.reply("Bạn không đủ tuổi để thu hồi tài sản của người khác!");

        const target = message.mentions.users.first();
        if (!target) return message.reply("Muốn reset ai thì tag người đó vào! Cú pháp: `f!resetmoney @ai_đó`");

        let targetData = await User.findOne({ userId: target.id });
        if (!targetData) targetData = await User.create({ userId: target.id });

        targetData.money = 0; // Chém thẳng tay về 0
        await targetData.save(); // Cập nhật lên MongoDB

        message.reply(`🔥 **Clearrr!** Toàn bộ tài sản của ${target.username} đã bị kho bạc nhà nước tịch thu. Số dư hiện tại: **0 đồng**! Trắng tay!`);
    }


// ----- LỆNH BẢNG PHONG THẦN (f!top) -----
    if (command === 'top') {
        // Chạy lên MongoDB tìm 10 người giàu nhất, sắp xếp lượng tiền giảm dần (-1)
        const topUsers = await User.find({ money: { $gt: 0 } }).sort({ money: -1 }).limit(10);

        if (topUsers.length === 0) {
            return message.reply("Chúng ta quá nghèo, chưa có ai kiếm được đồng nào để lên tivi cả!");
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 TOP ĐẠI GIA SERVER 🏆')
            .setDescription('Top 10 đại gia nắm trùm kinh tế của Địa Đạo hiện tại:')
            .setColor('#FFD700') // Màu vàng hoàng kim cho nó sang
            .setThumbnail(client.user.displayAvatarURL());

        let leaderboard = '';
        for (let i = 0; i < topUsers.length; i++) {
            // Trao huy chương cho top 3
            let medal = '🏅';
            if (i === 0) medal = '🥇';
            if (i === 1) medal = '🥈';
            if (i === 2) medal = '🥉';

            // Dùng <@ID> để Discord tự động hiển thị tên người dùng mà không Ping làm phiền họ
            // Hàm toLocaleString('vi-VN') giúp số tiền có dấu chấm cho dễ đọc (VD: 100.000 thay vì 100000)
            leaderboard += `${medal} **#${i + 1}** | <@${topUsers[i].userId}> ➪ **${topUsers[i].money.toLocaleString('vi-VN')} đồng**\n\n`;
        }

        embed.addFields({ name: '--- Danh Sách Tỷ Phú ---', value: leaderboard });
        embed.setFooter({ text: 'Chăm chỉ cày cuốc f!daily hoặc khô máu sòng bài để leo rank nhé!' });

        await message.reply({ embeds: [embed] });
    }
    // ----- LỆNH CHUYỂN KHOẢN (f!pay hoặc f!give) -----
    if (command === 'pay' || command === 'give') {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply(`Sai cú pháp! VD: \`${prefix}pay @ai_đó 5000\``);
        if (target.id === userId) return message.reply(`Sai cú pháp! Bạn không thể tự chuyển tiền cho chính mình!`);
        if (target.bot) return message.reply("Bot không xài tiền trần gian, tha cho nó đi!");
        if (!amount || isNaN(amount) || amount <= 0) return message.reply("Số tiền không hợp lệ! Nhập số tiền đàng hoàng vào.");

        // Kiểm tra số dư người gửi
        if (userData.money < amount) {
            return message.reply(`Ví bạn chỉ còn **${userData.money.toLocaleString('vi-VN')} đồng**, không đủ ngân sách để chuyển **${amount.toLocaleString('vi-VN')} đồng**!`);
        }

        // Áp dụng thuế phí 2% để kiểm soát lạm phát vĩ mô
        const tax = Math.floor(amount * 0.02);
        const actualReceived = amount - tax;

        // Lấy dữ liệu người nhận từ MongoDB
        let targetData = await User.findOne({ userId: target.id });
        if (!targetData) targetData = await User.create({ userId: target.id });

        // Trừ tiền người gửi, cộng tiền người nhận
        userData.money -= amount;
        targetData.money += actualReceived;

        await userData.save();
        await targetData.save();

        message.reply(`💸 Giao dịch thành công! Bạn đã chuyển **${amount.toLocaleString('vi-VN')} đồng** cho ${target.username}.\n*(Ngân hàng Trung ương thu phí giao dịch 2% là **${tax.toLocaleString('vi-VN')} đồng**, người nhận thực lãnh **${actualReceived.toLocaleString('vi-VN')} đồng**).*`);
    }
    // ----- LỆNH HƯỚNG DẪN (Bản Prefix Động) -----
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('📌 DANH SÁCH LỆNH')
            .setColor('#2ecc71')
            .addFields(
                { name: '💰 Kinh tế', value: `\`${prefix}bal\` - Xem số dư ví\n\`${prefix}daily\` hoặc \`${prefix}work\` - Nhận lương (mỗi 24h)\n\`${prefix}pay @user <số_tiền>\` - Chuyển khoản\n\`${prefix}top\` - Bảng xếp hạng đại gia` },
                { name: '🎲 Giải trí & Mua sắm', value: `\`${prefix}bj <số_tiền>\` - Đánh Blackjack\n\`${prefix}rob @user\` - Ăn cướp\n\`${prefix}shop\` - Mua Role` },
                { name: '🛠️ Admin', value: `\`${prefix}addmoney @user <số_tiền>\` - Bơm tiền\n\`${prefix}resetmoney @user\` - Reset ví về 0` }
            );

        await message.reply({ embeds: [embed] });
    }
});
client.login(process.env.TOKEN);