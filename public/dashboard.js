// 🟢 1. ระบบคำนวณกุญแจลับประจำวัน (อิงตามเวลาประเทศไทย)
const nowBKK = new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
const dObj = new Date(nowBKK);
const yStr = dObj.getFullYear();
const mStr = String(dObj.getMonth() + 1).padStart(2, '0');
const dayStr = String(dObj.getDate()).padStart(2, '0');
const todayDateStr = `${yStr}-${mStr}-${dayStr}`;

// สูตรสร้างกุญแจ = วันที่ + รหัสผ่าน แล้วแปลงเป็น Base64
const rawKey = `${todayDateStr}-WCMK2569`;
const expectedKey = btoa(rawKey); 

// 🟢 2. เช็คกุญแจลับจาก URL
const urlParams = new URLSearchParams(window.location.search);
const secretKey = urlParams.get('key');

if (secretKey) {
    if (secretKey === expectedKey) {
        // ถ้ารหัสตรง (ลิงก์ของวันนี้) -> ให้สิทธิ์เข้าใช้งาน
        localStorage.setItem('userRole', 'teacher'); 
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // ถ้ารหัสไม่ตรง (ลิงก์ของเมื่อวาน / ลิงก์หมดอายุ)
        alert('❌ ลิงก์นี้หมดอายุแล้วครับ (ลิงก์เข้าดูสถิติจะเปลี่ยนใหม่ทุกวัน)');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// 🟢 3. ระบบเช็คสิทธิ์เดิม (คนที่พิมพ์รหัสเข้าเองจากหน้าเว็บ ยังเข้าได้ปกติ)
const userRole = localStorage.getItem('userRole');
if(!userRole || userRole === 'student') window.location.href = "index.html";


import { db } from './firebase-config.js';
import { doc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

let myChart = null;
let unsubscribe = null;

const dateInput = document.getElementById('filterDate');
dateInput.value = todayDateStr; // ใช้วันที่ไทยที่คำนวณไว้ด้านบนได้เลย

function loadDashboardData() {
    const selectedDate = dateInput.value;
    document.getElementById('reportTitle').innerText = `รายงานการเช็คชื่อ ประจำวันที่ ${selectedDate}`;
    const tbody = document.getElementById('tableBody');
    const deleteBtn = document.getElementById('deleteBtn');
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';

    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(doc(db, "attendance", selectedDate), (docSnap) => {
        if (!docSnap.exists()) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500 font-bold">ไม่มีข้อมูลการเช็คชื่อในวันนี้</td></tr>';
            document.getElementById('reportMeta').innerHTML = '<i class="fa-solid fa-user-pen"></i> ผู้บันทึก: - | <i class="fa-solid fa-clock"></i> อัปเดตล่าสุด: -';
            deleteBtn.classList.add('hidden'); 
            resetStats();
            return;
        }

        deleteBtn.classList.remove('hidden'); 

        const data = docSnap.data();
        const records = data.records || [];
        
        const tStamp = data.timestamp?.toDate();
        const timeStr = tStamp ? tStamp.toLocaleTimeString('th-TH') : '-';
        document.getElementById('reportMeta').innerHTML = `<i class="fa-solid fa-user-pen"></i> ผู้บันทึก: <b>${data.checkerName || '-'}</b> | <i class="fa-solid fa-clock"></i> อัปเดตล่าสุด: <b>${timeStr} น.</b>`;

        let counts = { present: 0, absent: 0, sick: 0, leave: 0, late: 0, total: records.length };
        
        records.sort((a, b) => parseInt(a.studentId) - parseInt(b.studentId));
        
        tbody.innerHTML = '';
        records.forEach(student => {
            counts[student.status]++;
            
            let statusText = '', statusColor = '', bgRow = '';
            if(student.status === 'present') { statusText = 'มา'; statusColor = 'text-green-700 bg-green-100 rounded px-2 py-1'; }
            if(student.status === 'absent') { statusText = 'ขาด'; statusColor = 'text-red-700 bg-red-100 rounded px-2 py-1'; bgRow = 'bg-red-50'; }
            if(student.status === 'sick') { statusText = 'ป่วย'; statusColor = 'text-yellow-700 bg-yellow-100 rounded px-2 py-1'; bgRow = 'bg-yellow-50'; }
            if(student.status === 'leave') { statusText = 'ลากิจ'; statusColor = 'text-blue-700 bg-blue-100 rounded px-2 py-1'; }
            if(student.status === 'late') { statusText = 'สาย'; statusColor = 'text-orange-700 bg-orange-100 rounded px-2 py-1'; bgRow = 'bg-orange-50'; counts.late++; }

            const tr = document.createElement('tr');
            tr.className = `border-b ${bgRow}`;
            tr.innerHTML = `
                <td class="p-3 border text-center font-bold text-gray-700">${student.studentId}</td>
                <td class="p-3 border text-center text-sm text-gray-500">${student.studentCode || '-'}</td>
                <td class="p-3 border font-medium">${student.studentName}</td>
                <td class="p-3 border text-center"><span class="font-bold text-xs ${statusColor}">${statusText}</span></td>
                <td class="p-3 border text-center text-sm font-semibold text-orange-600">${student.remark || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('statTotal').innerText = counts.total;
        document.getElementById('statPresent').innerText = `${counts.present} (${((counts.present/counts.total)*100).toFixed(1)}%)`;
        document.getElementById('statAbsent').innerText = counts.absent;
        document.getElementById('statSick').innerText = counts.sick;
        document.getElementById('statLeave').innerText = counts.leave;
        document.getElementById('statLate').innerText = counts.late;

        renderChart(counts);
    });
}

function resetStats() {
    ['Total', 'Present', 'Absent', 'Sick', 'Leave', 'Late'].forEach(k => document.getElementById(`stat${k}`).innerText = '0');
    if(myChart) myChart.destroy();
}

function renderChart(counts) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['มาเรียน', 'ขาดเรียน', 'ป่วย', 'ลากิจ', 'สาย/มีกิจ'],
            datasets: [{
                data: [counts.present, counts.absent, counts.sick, counts.leave, counts.late],
                backgroundColor: ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#f97316'],
                borderWidth: 1
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

window.deleteAttendance = async function() {
    const selectedDate = document.getElementById('filterDate').value;
    if(!selectedDate) return;
    
    if(confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการ "ลบข้อมูลการเช็คชื่อ" ของวันที่ ${selectedDate} ?\n\n(หากลบแล้วจะไม่สามารถกู้คืนได้)`)) {
        try {
            await deleteDoc(doc(db, "attendance", selectedDate));
            alert("ลบข้อมูลเรียบร้อยแล้วครับ!");
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + error.message);
        }
    }
}

dateInput.addEventListener('change', loadDashboardData);
loadDashboardData();