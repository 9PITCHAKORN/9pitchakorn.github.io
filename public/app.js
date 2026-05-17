import { db } from './firebase-config.js';
import { collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

let students = [];
let remarks = {}; 
let isSystemOpen = true; 

const dateInput = document.getElementById('attendanceDate');
const todayStr = new Date().toISOString().split('T')[0];
dateInput.value = todayStr;
dateInput.max = todayStr; 

async function loadCheckers() {
    const select = document.getElementById('checkerName');
    select.innerHTML = '<option value="">-- เลือกผู้บันทึก --</option>';
    const snap = await getDocs(collection(db, "users"));
    snap.forEach((doc) => {
        select.innerHTML += `<option value="${doc.data().name}">${doc.data().name} (${doc.data().role})</option>`;
    });
}

onSnapshot(doc(db, "system", "settings"), (docSnap) => {
    if(docSnap.exists()){
        const data = docSnap.data();
        const now = new Date();
        const tempUntil = data.tempOpenUntil ? data.tempOpenUntil.toDate() : null;
        
        isSystemOpen = data.isOpen || (tempUntil && now < tempUntil);
        
        const btn = document.getElementById('submitBtn');
        const msg = document.getElementById('systemStatusMsg');
        
        if(isSystemOpen || localStorage.getItem('userRole') === 'admin') {
            btn.disabled = false;
            btn.className = "bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-700 w-full md:w-auto";
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลเช็คชื่อ';
            msg.className = "text-sm font-semibold text-green-600 bg-green-100 inline-block px-3 py-1 rounded-full mt-2";
            msg.innerHTML = '<i class="fa-solid fa-door-open"></i> ระบบเปิดรับข้อมูล';
        } else {
            btn.disabled = true;
            btn.className = "bg-gray-500 text-white font-bold py-3 px-8 rounded-full shadow-lg w-full md:w-auto cursor-not-allowed";
            btn.innerHTML = '<i class="fa-solid fa-lock"></i> ระบบปิดรับการเช็คชื่อแล้ว';
            msg.className = "text-sm font-semibold text-red-600 bg-red-100 inline-block px-3 py-1 rounded-full mt-2";
            msg.innerHTML = '<i class="fa-solid fa-lock"></i> ระบบถูกปิดการเช็คชื่อ';
        }
    }
});

async function loadAttendanceData() {
    const selectedDate = dateInput.value;
    const tbody = document.getElementById('studentList');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> กำลังโหลด...</td></tr>';
    
    remarks = {}; 
    
    const stdSnap = await getDocs(collection(db, "students"));
    students = [];
    stdSnap.forEach(d => {
        students.push({ id: d.data().number, code: d.data().code || '-', name: d.data().name });
    });
    students.sort((a, b) => a.id - b.id);

    const attSnap = await getDoc(doc(db, "attendance", selectedDate));
    let previousRecords = {};
    if(attSnap.exists()) {
        const data = attSnap.data();
        document.getElementById('checkerName').value = data.checkerName || '';
        data.records.forEach(r => {
            previousRecords[r.studentId] = r.status;
            if(r.remark) remarks[r.studentId] = r.remark;
        });
    } else {
        document.getElementById('checkerName').value = '';
    }

    tbody.innerHTML = '';
    const lateSelect = document.getElementById('lateStudentSelect');
    lateSelect.innerHTML = '<option value="">-- เลือกนักเรียน --</option>';

    students.forEach((student, i) => {
        const tr = document.createElement('tr');
        tr.className = i % 2 === 0 ? "bg-white border-b" : "bg-gray-50 border-b";
        
        const status = previousRecords[student.id] || '';
        const remarkText = remarks[student.id] || '-';
        
        tr.innerHTML = `
            <td class="p-3 text-center font-bold">${student.id}</td>
            <td class="p-3 text-sm text-gray-500">${student.code}</td>
            <td class="p-3 font-medium text-blue-900">${student.name}</td>
            <td class="p-3">
                <div class="flex justify-center space-x-1 md:space-x-3">
                    <label class="cursor-pointer text-center"><input type="radio" name="st_${student.id}" value="present" ${status==='present'?'checked':''} class="h-4 w-4 text-green-600"><br><span class="text-xs text-green-600">มา</span></label>
                    <label class="cursor-pointer text-center"><input type="radio" name="st_${student.id}" value="absent" ${status==='absent'?'checked':''} class="h-4 w-4 text-red-600"><br><span class="text-xs text-red-600">ขาด</span></label>
                    <label class="cursor-pointer text-center"><input type="radio" name="st_${student.id}" value="sick" ${status==='sick'?'checked':''} class="h-4 w-4 text-yellow-500"><br><span class="text-xs text-yellow-500">ป่วย</span></label>
                    <label class="cursor-pointer text-center"><input type="radio" name="st_${student.id}" value="leave" ${status==='leave'?'checked':''} class="h-4 w-4 text-blue-500"><br><span class="text-xs text-blue-500">ลากิจ</span></label>
                    <label class="cursor-pointer text-center"><input type="radio" name="st_${student.id}" value="late" ${status==='late'?'checked':''} class="h-4 w-4 text-orange-500"><br><span class="text-xs text-orange-500">สาย</span></label>
                </div>
            </td>
            <td class="p-3 text-center text-xs text-orange-600 font-semibold" id="remark_${student.id}">${remarkText !== '-' ? remarkText : ''}</td>
        `;
        tbody.appendChild(tr);
        lateSelect.innerHTML += `<option value="${student.id}">เลขที่ ${student.id} - ${student.name}</option>`;
    });
}

dateInput.addEventListener('change', loadAttendanceData);

window.selectAll = function(val) {
    students.forEach(s => {
        const rads = document.getElementsByName(`st_${s.id}`);
        rads.forEach(r => { if(r.value === val) r.checked = true; });
    });
}

// 🟢 ฟังก์ชันล้างการเลือกทั้งหมด
window.clearAll = function() {
    students.forEach(s => {
        const rads = document.getElementsByName(`st_${s.id}`);
        rads.forEach(r => r.checked = false); // เอาติ๊กออกให้หมด
        
        // ล้างหมายเหตุ (ถ้ามี)
        const remarkEl = document.getElementById(`remark_${s.id}`);
        if(remarkEl) remarkEl.innerText = '';
    });
    remarks = {}; // เคลียร์ตัวแปรความจำหมายเหตุ
}

window.openLateModal = () => document.getElementById('lateModal').classList.remove('hidden');

document.getElementById('saveLateBtn').addEventListener('click', () => {
    const sId = document.getElementById('lateStudentSelect').value;
    const time = document.getElementById('lateTime').value;
    const type = document.getElementById('lateType').value;
    
    if(!sId || !time) { alert('เลือกนักเรียนและระบุเวลาด้วยครับ'); return; }
    
    const text = `${type === 'late' ? 'สาย' : 'มีกิจ'} (${time} น.)`;
    remarks[sId] = text; 
    
    document.getElementById(`remark_${sId}`).innerText = text;
    const rads = document.getElementsByName(`st_${sId}`);
    rads.forEach(r => { if(r.value === 'late') r.checked = true; });
    
    document.getElementById('lateModal').classList.add('hidden');
});

document.getElementById('submitBtn').addEventListener('click', async () => {
    const checker = document.getElementById('checkerName').value;
    if(!checker) { alert('กรุณาเลือกชื่อผู้บันทึกครับ!'); return; }
    
    const attendanceData = [];
    let isComplete = true;
    students.forEach(student => {
        const selected = document.querySelector(`input[name="st_${student.id}"]:checked`);
        if(!selected) isComplete = false;
        else {
            attendanceData.push({ 
                studentId: student.id, 
                studentCode: student.code,
                studentName: student.name, 
                status: selected.value,
                remark: remarks[student.id] || ''
            });
        }
    });

    if(!isComplete) { alert('กรุณาเช็คชื่อให้ครบทุกคนครับ!'); return; }

    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    try {
        await setDoc(doc(db, "attendance", dateInput.value), {
            date: dateInput.value,
            timestamp: new Date(),
            checkerName: checker,
            records: attendanceData
        });
        alert("บันทึกข้อมูลเรียบร้อย!");
        loadAttendanceData(); 
    } catch (e) {
        alert("เกิดข้อผิดพลาด: " + e.message);
    }
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลเช็คชื่อ';
});

document.getElementById('loginBtn').addEventListener('click', async () => {
    const user = document.getElementById('loginUsername').value;
    const pass = document.getElementById('loginPassword').value;
    if(user === 'admin' && pass === '1234') {
        localStorage.setItem('userRole', 'admin'); window.location.href = 'dashboard.html'; return;
    }
    try {
        const q = query(collection(db, "users"), where("username", "==", user), where("password", "==", pass));
        const snap = await getDocs(q);
        if (!snap.empty) {
            let role = ''; snap.forEach(doc => { role = doc.data().role; });
            if(role === 'student') alert('นักเรียนเข้าหลังบ้านไม่ได้ครับ');
            else { localStorage.setItem('userRole', role); window.location.href = 'dashboard.html'; }
        } else alert('รหัสไม่ถูกต้อง!');
    } catch (e) { console.log(e); }
});

loadCheckers();
loadAttendanceData();