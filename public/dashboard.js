const userRole = localStorage.getItem('userRole');
if(!userRole || userRole === 'student') window.location.href = "index.html";

import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

let myChart = null;
let unsubscribe = null;

const dateInput = document.getElementById('filterDate');
dateInput.value = new Date().toISOString().split('T')[0];

function loadDashboardData() {
    const selectedDate = dateInput.value;
    document.getElementById('reportTitle').innerText = `รายงานการเช็คชื่อ ประจำวันที่ ${selectedDate}`;
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';

    if (unsubscribe) unsubscribe();

    // ดึงข้อมูลรายวันตามวันที่เลือก
    unsubscribe = onSnapshot(doc(db, "attendance", selectedDate), (docSnap) => {
        if (!docSnap.exists()) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500 font-bold">ไม่มีข้อมูลการเช็คชื่อในวันนี้</td></tr>';
            document.getElementById('reportMeta').innerHTML = '<i class="fa-solid fa-user-pen"></i> ผู้บันทึก: - | <i class="fa-solid fa-clock"></i> อัปเดตล่าสุด: -';
            resetStats();
            return;
        }

        const data = docSnap.data();
        const records = data.records || [];
        
        // จัดการเรื่องเวลาอัปเดตล่าสุด
        const tStamp = data.timestamp?.toDate();
        const timeStr = tStamp ? tStamp.toLocaleTimeString('th-TH') : '-';
        document.getElementById('reportMeta').innerHTML = `<i class="fa-solid fa-user-pen"></i> ผู้บันทึก: <b>${data.checkerName || '-'}</b> | <i class="fa-solid fa-clock"></i> อัปเดตล่าสุด: <b>${timeStr} น.</b>`;

        let counts = { present: 0, absent: 0, sick: 0, leave: 0, late: 0, total: records.length };
        
        // เรียงลำดับตามเลขที่นักเรียน
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

dateInput.addEventListener('change', loadDashboardData);
loadDashboardData();