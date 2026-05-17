async function sendLineBot() {
    // 1. หาวันที่ปัจจุบัน (เวลาไทย)
    const date = new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
    const today = new Date(date);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // 2. ดึงข้อมูลจาก Firebase ของโปรเจกต์
    const projectId = "check-m2-2026";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/attendance/${dateStr}`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`[ผ่าน] ไม่มีข้อมูลเช็คชื่อของวันที่ ${dateStr} (อาจจะยังไม่มีการบันทึกข้อมูล)`);
            return;
        }
        
        const data = await res.json();
        
        // 3. สรุปข้อมูล (เพิ่มระบบป้องกัน Error กรณีข้อมูลว่างเปล่าด้วย ?.)
        const records = data?.fields?.records?.arrayValue?.values || [];
        let counts = { present: 0, absent: 0, sick: 0, leave: 0, late: 0, total: records.length };
        
        records.forEach(r => {
            const status = r?.mapValue?.fields?.status?.stringValue;
            if(status && counts[status] !== undefined) counts[status]++;
        });

        const checker = data?.fields?.checkerName?.stringValue || "ไม่ระบุ";

        // 4. จัดรูปแบบข้อความ
        let msg = `📝 สรุปการเช็คชื่อประจำวัน\n📅 วันที่: ${dateStr}\n👤 ผู้บันทึก: ${checker}\n`;
        msg += `-----------------\n`;
        msg += `👥 นักเรียนทั้งหมด: ${counts.total} คน\n`;
        msg += `✅ มาเรียน: ${counts.present} คน\n`;
        msg += `❌ ขาดเรียน: ${counts.absent} คน\n`;
        msg += `🤒 ป่วย: ${counts.sick} คน\n`;
        msg += `💼 ลากิจ: ${counts.leave} คน\n`;
        msg += `⏰ สาย/มีกิจ: ${counts.late} คน\n`;
        msg += `-----------------\n`;
        msg += `👉 ดูรายละเอียด: https://check-m2-2026.web.app`;

        // 5. ส่งเข้า LINE Messaging API
        const lineToken = process.env.LINE_CHANNEL_TOKEN;
        const targetId = process.env.LINE_TARGET_ID;

        if(!lineToken || !targetId) {
            console.error("[Error] ไม่พบ LINE_CHANNEL_TOKEN หรือ LINE_TARGET_ID ใน GitHub Secrets");
            process.exit(1); 
        }

        const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${lineToken}`
            },
            body: JSON.stringify({
                to: targetId,
                messages: [{ type: "text", text: msg }]
            })
        });
        
        if(lineRes.ok) {
            console.log("✅ ส่งแจ้งเตือน LINE สำเร็จ!");
        } else {
            console.error("❌ ส่งแจ้งเตือนล้มเหลว:", await lineRes.text());
            process.exit(1);
        }

    } catch (error) {
        console.error("💥 เกิดข้อผิดพลาดรุนแรงในการรันสคริปต์:", error);
        process.exit(1);
    }
}

sendLineBot();