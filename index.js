
require('dotenv').config(); // Bùa chú giấu Token
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const axios = require('axios'); 
//money
// Thay bằng ID thật của ông lấy ở Bước 1 nhé
const coinEmoji = '<:coinn:1488017564817817711>'; 
const cashEmoji = '<:moneyy:1488016482695643206> ';


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

// Create Schema và Model cho MongoDB
// Tạo khuôn mẫu sổ nợ trên mây (Đã mở rộng thêm Balo Pokemon)
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    money: { type: Number, default: 0 },
    lastDaily: { type: Number, default: 0 },
    pokedex: [{
        pokeId: Number,   
        name: String,     
        rarity: String,   
        bst: Number,      
        sprite: String,   
        caughtAt: { type: Number, default: Date.now } 
    }]
});
const User = mongoose.model('User', UserSchema);

// 2. Khuôn mẫu cấu hình Server (Blacklist kênh)
const ConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    blacklistedChannels: { type: Array, default: [] }
});
const Config = mongoose.model('Config', ConfigSchema);


client.once('ready', async () => {
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

    // ==========================================
    // 🛡️ CỔNG BẢO VỆ BLACKLIST (MỚI THÊM)
    // ==========================================
    if (message.guild) {
        let config = await Config.findOne({ guildId: message.guild.id });
        if (config && config.blacklistedChannels.includes(message.channel.id)) {
            // Nếu kênh bị cấm, xem thằng gõ lệnh có phải Admin không
            const isSudo = message.member ? message.member.permissions.has('Administrator') : false;
            if (!isSudo) return; // Không phải Admin -> Bơ luôn không thèm rep
        }
    }
    // ==========================================
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
        message.reply(`Bạn vừa điểm danh thành công và nhận được **${luong} ${coinEmoji}**. Số dư: **${userData.money} ${coinEmoji}**.`);
    }

    // ----- LỆNH XEM VÍ -----
    if (command === 'bal') {
        message.reply(`Ví của bạn đang có: **${userData.money} ${coinEmoji}**. Đi làm chăm chỉ hoặc chơi game để kiếm thêm tiền nhé!`);
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

        if (userData.money < tienPhat) return message.reply(`Để cướp người này, bạn cần ít nhất **${tienPhat} ${coinEmoji}** trong ví (để phòng nộp phạt nếu bị tóm). Hiện tại bạn không đủ!`);

        const isSuccess = Math.random() < 0.4;
        
        if (isSuccess) {
            victimData.money -= tienDinhCuop;
            userData.money += tienDinhCuop;
            await victimData.save();
            await userData.save();
            message.reply(`Ngon lành! Bạn vừa móc túi ${victim.username} hốt trọn **${tienDinhCuop} ${coinEmoji}**. Chạy mau trước khi cảnh sát tóm!!`);
        } else {
            userData.money -= tienPhat;
            victimData.money += tienPhat;
            await victimData.save();
            await userData.save();
            message.reply(`Úi chà! Bạn thò tay vào túi ${victim.username} định cướp thì bị tóm. Bị ăn 1 chày và nộp phạt **${tienPhat} ${coinEmoji}** cho nạn nhân!`);
        }
    }

    // ----- LỆNH BLACKJACK -----
    if (command === 'bj') {
        const cuoc = parseInt(args[0]); 
        
        // --- KHU VỰC GIỚI HẠN CƯỢC (BẢN CHUẨN) ---
        const MAX_BET = 250000; 

        if (isNaN(cuoc) || cuoc <= 0) {
            return message.reply(`🚫 Nhập số tiền cược đàng hoàng vào sếp ơi!`);
        }

        if (cuoc > MAX_BET) {
            return message.reply(`⚠️ Sòng bạc chỉ nhận tối đa **${MAX_BET.toLocaleString('vi-VN')} ${coinEmoji}** mỗi ván!`);
        }

        if (userData.money < cuoc) {
            return message.reply(`Ví còn có **${userData.money.toLocaleString('vi-VN')} ${coinEmoji}** mà đòi cược **${cuoc.toLocaleString('vi-VN')}** à?`);
        }

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
                    resultMsg = `🎉 DEALER THUA! Bạn thắng **${cuoc * 2} ${coinEmoji}**!`;
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
                new StringSelectMenuOptionBuilder().setLabel('Phắc boiz 😼').setDescription('Giá: 30,000 ${coinEmoji}').setValue('role_phacboiz'),
                new StringSelectMenuOptionBuilder().setLabel('Chúa tể xamlin    🗡').setDescription('Giá: 100,000 ${coinEmoji}').setValue('role_chuatexmlin'),
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
                return i.reply({ content: `Chú em quá nghèo,chú em còn thiếu **${price - userData.money} ${coinEmoji}** nữa.`, ephemeral: true });
            }

            if (i.member.roles.cache.has(roleId)) return i.reply({ content: 'Bạn đã sỡ hữu role này,vui lòng chọn role khác!', ephemeral: true });

            try {
                userData.money -= price; 
                await userData.save(); // LƯU VÍ LÊN MÂY

                await i.member.roles.add(roleId); 
                await i.reply({ content: `🎉 Giao dịch thành công! Bạn đã chi **${price} ${coinEmoji}** để mua role **${roleName}**!` });
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
    const isAdmin = message.member ? message.member.permissions.has('Administrator') : false;

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

        message.reply(`💸 **BÙM!** Tổng tài vừa bơm nóng **${amount} ${coinEmoji}** vào két của ${target.username}. Tổng tài sản: **${targetData.money} ${coinEmoji}**.`);
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

        message.reply(`🔥 **Clearrr!** Toàn bộ tài sản của ${target.username} đã bị kho bạc nhà nước tịch thu. Số dư hiện tại: **0 ${coinEmoji}**! Trắng tay!`);
    }


// ----- LỆNH BẢNG PHONG THẦN (f!top) -----
    if (command === 'top') {
        // Chạy lên MongoDB tìm 10 người giàu nhất, sắp xếp lượng tiền giảm dần (-1)
        const topUsers = await User.find({ money: { $gt: 0 } }).sort({ money: -1 }).limit(10);

        if (topUsers.length === 0) {
            return message.reply("Chúng ta quá nghèo, chưa có ai kiếm được ${coinEmoji} nào để lên tivi cả!");
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
            leaderboard += `${medal} **#${i + 1}** | <@${topUsers[i].userId}> ➪ **${topUsers[i].money.toLocaleString('vi-VN')} ${coinEmoji}**\n\n`;
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
            return message.reply(`Ví bạn chỉ còn **${userData.money.toLocaleString('vi-VN')} ${coinEmoji}**, không đủ ngân sách để chuyển **${amount.toLocaleString('vi-VN')} ${coinEmoji}**!`);
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

        message.reply(`💸 Giao dịch thành công! Bạn đã chuyển **${amount.toLocaleString('vi-VN')} ${coinEmoji}** cho ${target.username}.\n*(Ngân hàng Trung ương thu phí giao dịch 2% là **${tax.toLocaleString('vi-VN')} ${coinEmoji}**, người nhận thực lãnh **${actualReceived.toLocaleString('vi-VN')} ${coinEmoji}**).*`);
    }
    // ----- LỆNH HƯỚNG DẪN (Bản Prefix Động) -----
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('📌 DANH SÁCH LỆNH')
            .setColor('#2ecc71')
            .addFields(
               { 
                    name: '💰 Kinh tế & Xếp hạng', 
                    value: `\`${prefix}bal\` - Kiểm tra ví tiền\n\`${prefix}daily\` - Nhận lương (24h/lần)\n\`${prefix}pay @user <tiền>\` - Chuyển tiền (Phí 2%)\n\`${prefix}top\` - Bảng vàng đại gia` 
                },
                { 
                    name: '🎒 Pokemon Gacha (Mới)', 
                    value: `\`${prefix}catch\` - Quay thẻ Pokemon (10k/lần)\n\`${prefix}inv\` - Xem túi đồ Pokemon\n\`${prefix}flex <stt/tên>\` - Khoe thẻ bài xịn\n\`${prefix}sell <stt>\` - Bán thẻ lấy tiền` 
                },
                { 
                    name: '🎲 Giải trí', 
                    value: `\`${prefix}bj <tiền>\` - Đánh bài Blackjack\n\`${prefix}rob @user\` - Móc túi người khác` 
                },
                { 
                    name: '🛠️ Quản trị (Admin)', 
                    value: `\`${prefix}blacklist\` - Chặn/Mở bot tại kênh này\n\`${prefix}addmoney @user <tiền>\` - Bơm tiền\n\`${prefix}resetmoney @user\` - Thu hồi tài sản` 
                }
            )
            .setFooter({ text: `Prefix hiện tại là: ${prefix}` });

        await message.reply({ embeds: [embed] });
    }
            

       //====================================
    // ----- KHU VỰC GACHA POKEMON (CHỐNG CHÁN) -----
    // ==========================================
   

    // 1. Lệnh Quay Thẻ Bài (${prefix}catch hoặc ${prefix}gacha)
    if (command === 'catch' || command === 'gacha') {
        const catchCost = 10000; // Giá mỗi lần quay (Hút máu mạnh vào)

        if (userData.money < catchCost) {
            return message.reply(`Nghèo mà đòi làm Huấn luyện viên? Cần **${catchCost.toLocaleString('vi-VN')} ${coinEmoji}** để mua Ball!`);
        }

        const msg = await message.reply('🎲 Đang ném Ball, cầu nguyện nhân phẩm đi...');

        try {
            // Quay số ngẫu nhiên ID Pokemon (Gen 1 đến Gen 9 hiện tại)
            const randomId = Math.floor(Math.random() * 1025) + 1;
            
            // Gọi lên PokeAPI lấy thông tin
            const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
            const data = response.data;

            // Tính toán Base Stat Total (BST) - Tổng sức mạnh làm căn cứ tính tiền
            const bst = data.stats.reduce((sum, stat) => sum + stat.base_stat, 0);

            // Viết hoa chữ cái đầu tên cho đẹp
            const pokeName = data.name.charAt(0).toUpperCase() + data.name.slice(1);

            // Phân loại độ hiếm dựa trên chỉ số (Cân bằng kinh tế)
            let rarity = '🟤 COMMON'; // BST < 420 (Loss)
            let color = '#7f8c8d';
            if (bst >= 420 && bst < 530) { rarity = '🔵 RARE'; color = '#3498db'; } // BST 420-530 (Small Loss)
            if (bst >= 530 && bst < 600) { rarity = '🟣 EPIC'; color = '#9b59b6'; } // BST 530-600 (Break even)
            if (bst >= 600) { rarity = '🟡 LEGENDARY'; color = '#f1c40f'; } // BST > 600 (Win)

            // Lấy ảnh chính thức từ API
            const spriteUrl = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;

            // Thu tiền người chơi
            userData.money -= catchCost;

            // Cất thẻ vào túi đồ trên mây
            userData.pokedex.push({
                pokeId: randomId,
                name: pokeName,
                rarity: rarity,
                bst: bst,
                sprite: spriteUrl,
                caughtAt: Date.now()
            });

            // Nếu người chơi có số lượng pokemon lớn hơn 50, tự động bán con common/rare bst thấp nhất (Tùy chọn nâng cao)
            // if (userData.pokedex.length > 50) { ... } 

            await userData.save(); // Lưu tất cả lên mây

            // Tạo bảng thông báo trúng thưởng rực rỡ
            const embed = new EmbedBuilder()
                .setTitle(`🎉 BẮT ĐƯỢC POKEMON! 🎉`)
                .setDescription(`Bạn vừa chi **${catchCost.toLocaleString('vi-VN')} ${coinEmoji}** và nhận được:`)
                .addFields(
                    { name: `Tên: ${pokeName}`, value: `**BST:** ${bst}`, inline: true },
                    { name: `Độ hiếm: ${rarity}`, value: `---`, inline: true },
                    { name: '💰 Chỉ số', value: `Gõ \`${prefix}pokedex\` để xem danh sách`, inline: false }
                )
                .setImage(spriteUrl)
                .setColor(color)
                .setFooter({ text: 'Nhân phẩm không tốt thì gõ daily cày lại nhé!' });

            await msg.edit({ content: ' ', embeds: [embed] });

        } catch (error) {
            console.error(error);
            await msg.edit('💥 Lỗi hệ thống khi gọi PokeAPI, Ball đã được hoàn lại! Thử lại sau.');
        }
    }

    // 2. Lệnh Kiểm Tra Balo (${prefix}pokedex hoặc ${prefix}inv)
    if (command === 'pokedex' || command === 'inv' || command === 'balo') {
        const pokedex = userData.pokedex;

        if (pokedex.length === 0) {
            return message.reply(`Balo trống không, gõ \`${prefix}catch\` để bắt vài con đi!`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎒 BALO POKEMON CỦA ${message.author.username.toUpperCase()} 🎒`)
            .setDescription(`Liệt kê 20 Pokemon đầu tiên trong túi đồ của bạn:\nCú pháp bán: \`${prefix}sell <index>\``)
            .setColor('#2ecc71');

        let list = '';
        // Hiển thị 20 con đầu tiên cho đỡ trôi tin nhắn
        const displayLimit = Math.min(pokedex.length, 20); 

        for (let i = 0; i < displayLimit; i++) {
            const poke = pokedex[i];
            
            // Tính toán giá bán tương đối (Căn bằng kinh tế)
            let sellPrice = 2000; // Common Sell Price
            if (poke.bst >= 420 && poke.bst < 530) { sellPrice = 5000; } // Rare Sell Price
            if (poke.bst >= 530 && poke.bst < 600) { sellPrice = 10000; } // Epic Sell Price
            if (poke.bst >= 600) { sellPrice = 100000; } // Legendary Sell Price

            list += `\`[${i + 1}]\` | **${poke.name}** - BST: ${poke.bst}\n└ Rarity: ${poke.rarity} | 💰 Giá bán: \`${sellPrice.toLocaleString('vi-VN')} đ\`\n\n`;
        }

        embed.addFields({ name: '--- Danh Sách ---', value: list });
        if (pokedex.length > 20) {
            embed.setFooter({ text: `Và ${pokedex.length - 20} con khác nữa đang nằm trong kho...` });
        }

        await message.reply({ embeds: [embed] });
    }

    // 3. Lệnh Bán Pokemon Lấy Tiền (${prefix}sellpokemon <index>)
    if (command === 'sellpokemon' || command === 'sell') {
        const index = parseInt(args[0]) - 1; // Lấy vị trí trong mảng (VD: 1 -> index 0)

        if (isNaN(index) || index < 0 || index >= userData.pokedex.length) {
            return message.reply(`Gõ sai rồi sếp! Cú pháp chuẩn: \`${prefix}sell <số_thứ_tự_trong_balo>\`. Xem số ở \`${prefix}pokedex\`.`);
        }

        // Lấy con Pokemon đó ra xem
        const pokeToSell = userData.pokedex[index];

        // LÔGIC TÍNH GIÁ BÁN (VÒNG LẶP KINH TẾ CHỐNG CHÁN)
        let sellPrice = 2000; // Common Sell Price (Lỗ 80%)
        if (pokeToSell.bst >= 420 && pokeToSell.bst < 530) { sellPrice = 5000; } // Rare Sell Price (Lỗ 50%)
        if (pokeToSell.bst >= 530 && pokeToSell.bst < 600) { sellPrice = 10000; } // Epic Sell Price (Hòa vốn)
        if (pokeToSell.bst >= 600) { sellPrice = 100000; } // Legendary Sell Price (Thắng đậm x10)

        // Thực hiện giao dịch
        userData.money += sellPrice; // Cộng tiền
        userData.pokedex.splice(index, 1); // Xóa khỏi balo (Kỹ thuật mảng)

        await userData.save(); // Lưu lên mây

        message.reply(`💸 Giao dịch thành công! Bạn vừa bán thẻ bài **${pokeToSell.name}** và nhận được **${sellPrice.toLocaleString('vi-VN')} ${coinEmoji}**.`);
    }
    // ----- LỆNH FLEX POKEMON (Tìm theo STT hoặc TÊN) -----
    if (command === 'flex' || command === 'show') {
        if (!args[0]) {
            return message.reply(`Bạn muốn khoe con nào? Gõ \`${prefix}flex <số_thứ_tự>\` hoặc \`${prefix}flex <tên_pokemon>\` nhé!`);
        }

        if (!userData.pokedex || userData.pokedex.length === 0) {
            return message.reply("Balo của bạn đang trống không, lấy gì mà khoe?");
        }

        // Gộp tất cả các chữ người dùng gõ vào và chuyển thành chữ thường để dễ tìm kiếm
        const query = args.join(' ').toLowerCase();
        let poke = null;

        // KỊCH BẢN 1: Người dùng gõ Số Thứ Tự (Ví dụ: f!flex 1)
        if (!isNaN(query)) {
            const index = parseInt(query) - 1;
            if (index >= 0 && index < userData.pokedex.length) {
                poke = userData.pokedex[index];
            }
        } 
        // KỊCH BẢN 2: Người dùng gõ Tên (Ví dụ: f!flex pikachu)
        else {
            // Lục tung balo xem có con nào trùng tên không
            poke = userData.pokedex.find(p => p.name.toLowerCase() === query);
        }

        // Nếu lục tung cả STT lẫn Tên mà vẫn không thấy
        if (!poke) {
            return message.reply(`Không tìm thấy con **${args.join(' ')}** nào trong balo của bạn! Gõ \`${prefix}pokedex\` để check lại hàng nhé.`);
        }

        // Phối màu viền Embed cho chuẩn hệ dân chơi
        let color = '#7f8c8d'; // Màu xám cho Common
        if (poke.rarity.includes('RARE')) color = '#3498db'; // Xanh biển
        if (poke.rarity.includes('EPIC')) color = '#9b59b6'; // Tím mộng mơ
        if (poke.rarity.includes('LEGENDARY')) color = '#f1c40f'; // Vàng hoàng kim lấp lánh

        // Dịch thời gian bắt được sang giờ Việt Nam
        const catchDate = new Date(poke.caughtAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        const embed = new EmbedBuilder()
            .setTitle(`✨ ${message.author.username} đang flex! ✨`)
            .setDescription(`*"Tiến lên, **${poke.name}**!"*`)
            .addFields(
                { name: '🌟 Tier', value: poke.rarity, inline: true },
                { name: '💪 Sức mạnh (BST)', value: `${poke.bst} điểm`, inline: true },
                { name: '📅 Thu phục lúc', value: catchDate, inline: false }
            )
            .setImage(poke.sprite) 
            .setColor(color)
            .setThumbnail(message.author.displayAvatarURL()); 

        await message.reply({ embeds: [embed] });
    }

    // ----- QUẢN LÝ BLACKLIST KÊNH (BẢN NÂNG CẤP PRO) -----
    if (command === 'blacklist' || command === 'bl') {
        // Kiểm tra quyền Admin
        if (!message.member.permissions.has('Administrator')) {
            return message.reply("🚫 Chỉ các sếp (Admin) mới có quyền khóa mõm bot nhé!");
        }

        // Lấy dữ liệu server từ Database
        let config = await Config.findOne({ guildId: message.guild.id });
        if (!config) config = await Config.create({ guildId: message.guild.id });

        const action = args[0] ? args[0].toLowerCase() : null;

        // TÍNH NĂNG 1: Xem danh sách kênh bị cấm (f!blacklist list)
        if (action === 'list') {
            if (config.blacklistedChannels.length === 0) {
                return message.reply("✅ Bot hiện đang tự do bay nhảy, chưa bị cấm ở kênh nào cả.");
            }

            // Chuyển mảng ID thành định dạng Tag kênh của Discord (<#id>)
            const list = config.blacklistedChannels.map(id => `• <#${id}>`).join('\n');
            
            const embed = new EmbedBuilder()
                .setTitle('🚫 DANH SÁCH KÊNH CẤM BOT')
                .setColor('#e74c3c') // Màu đỏ cảnh báo
                .setDescription(`Con bot đang bị "khóa mõm" tại các kênh sau:\n\n${list}`)
                .setFooter({ text: `Gõ ${prefix}blacklist để bật/tắt cấm kênh hiện tại` });
            
            return message.reply({ embeds: [embed] });
        }

        // TÍNH NĂNG 2: Ân xá toàn bộ (f!blacklist clear)
        if (action === 'clear') {
            config.blacklistedChannels = []; // Xóa trắng mảng
            await config.save();
            return message.reply("✅ Đã ân xá cho toàn bộ các kênh! Bot có thể hóng hớt ở mọi nơi.");
        }

        // TÍNH NĂNG 3: Thêm/Xóa kênh lẻ (Hoạt động như cũ nhưng mượt hơn)
        // Ưu tiên kênh được tag, nếu không tag thì lấy kênh hiện tại
        const channel = message.mentions.channels.first() || message.channel;

        if (config.blacklistedChannels.includes(channel.id)) {
            // Nếu kênh đã có trong danh sách -> GỠ RA
            config.blacklistedChannels = config.blacklistedChannels.filter(id => id !== channel.id);
            await config.save();
            return message.reply(`✅ Đã gỡ lệnh cấm cho kênh ${channel}. Bot sẽ lại hóng hớt ở đây.`);
        } else {
            // Nếu kênh chưa có -> THÊM VÀO
            config.blacklistedChannels.push(channel.id);
            await config.save();
            return message.reply(`🚫 Đã "khóa mõm" bot tại kênh ${channel}. Anh em cứ làm việc nghiêm túc nhé!`);
        }
    }
});
client.login(process.env.TOKEN);