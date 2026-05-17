async function sendLineBot() {
    // 1. หาวันที่ปัจจุบัน (เวลาไทย)
    const date = new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
    const today = new Date(date);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // 🟢 สร้างรหัสผ่านประจำวัน (วันที่ + WCMK2569) แล้วเข้ารหัส Base64
    const rawKey = `${dateStr}-WCMK2569`;
    const dailySecret = encodeURIComponent(Buffer.from(rawKey).toString('base64'));

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
        
        // 3. เตรียมตัวแปรสรุปยอดและแยกรายชื่อ
        const records = data?.fields?.records?.arrayValue?.values || [];
        let counts = { present: 0, absent: 0, sick: 0, leave: 0, late: 0, total: records.length };
        
        let absents = []; // ขาด
        let sicks = [];    // ป่วย
        let leaves = [];   // ลา
        let lates = [];    // สาย

        records.forEach(r => {
            const fields = r?.mapValue?.fields;
            const id = fields?.studentId?.integerValue || fields?.studentId?.stringValue || "";
            const name = fields?.studentName?.stringValue || "";
            const status = fields?.status?.stringValue;
            const remark = fields?.remark?.stringValue || "";

            if(status && counts[status] !== undefined) counts[status]++;

            const studentInfo = `เลขที่ ${id} ${name}` + (remark ? ` (${remark})` : "");

            if (status === 'absent') absents.push(studentInfo);
            else if (status === 'sick') sicks.push(studentInfo);
            else if (status === 'leave') leaves.push(studentInfo);
            else if (status === 'late') lates.push(studentInfo);
        });

        const checker = data?.fields?.checkerName?.stringValue || "ไม่ระบุ";

        // 4. จัดรูปแบบข้อความส่วนหัวและสรุปยอด
        let msg = `📝 สรุปการเช็คชื่อประจำวัน\n📅 วันที่: ${dateStr}\n👤 ผู้บันทึก: ${checker}\n`;
        msg += `-----------------\n`;
        msg += `👥 นักเรียนทั้งหมด: ${counts.total} คน\n`;
        msg += `✅ มาเรียน: ${counts.present} คน\n`;
        msg += `❌ ขาดเรียน: ${counts.absent} คน\n`;
        msg += `🤒 ป่วย: ${counts.sick} คน\n`;
        msg += `💼 ลากิจ: ${counts.leave} คน\n`;
        msg += `⏰ สาย/มีกิจ: ${counts.late} คน\n`;
        msg += `-----------------`;

        // 5. ระบบเพิ่มรายชื่อนักเรียนแยกตามสถานะ
        if (absents.length > 0) {
            msg += `\n\n❌ รายชื่อนักเรียนที่ [ขาด]:\n` + absents.map(s => `- ${s}`).join('\n');
        }
        if (sicks.length > 0) {
            msg += `\n\n🤒 รายชื่อนักเรียนที่ [ป่วย]:\n` + sicks.map(s => `- ${s}`).join('\n');
        }
        if (leaves.length > 0) {
            msg += `\n\n💼 รายชื่อนักเรียนที่ [ลากิจ]:\n` + leaves.map(s => `- ${s}`).join('\n');
        }
        if (lates.length > 0) {
            msg += `\n\n⏰ รายชื่อนักเรียนที่ [มาสาย/มีกิจ]:\n` + lates.map(s => `- ${s}`).join('\n');
        }

        // 🟢 ฝังกุญแจลับประจำวัน (เปลี่ยนอัตโนมัติทุกเที่ยงคืน) เข้าไปในลิงก์
        msg += `\n\n🏠 หน้าเช็คชื่อ: https://check-m2-2026.web.app`;
        msg += `\n📊 ดูสรุปยอดรายวัน: https://check-m2-2026.web.app/dashboard.html?key=${dailySecret}`;

        // 6. ส่งเข้า LINE Messaging API
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