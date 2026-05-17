import { db } from './firebase-config.js';
import { doc, setDoc, collection, deleteDoc, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const userRole = localStorage.getItem('userRole');
if(!userRole || userRole === 'student') {
    window.location.href = "index.html";
}

if(userRole === 'admin') {
    document.getElementById('adminArea').classList.remove('hidden');
    document.getElementById('systemControlArea').classList.remove('hidden');
    loadSystemUsers();
}

let isSystemOpen = true;
onSnapshot(doc(db, "system", "settings"), (snap) => {
    if(snap.exists()) {
        const data = snap.data();
        isSystemOpen = data.isOpen !== false; 
        
        const btn = document.getElementById('toggleSystemBtn');
        btn.className = isSystemOpen ? "px-6 py-2 rounded-full font-bold shadow bg-green-500 text-white" : "px-6 py-2 rounded-full font-bold shadow bg-red-500 text-white";
        btn.innerHTML = isSystemOpen ? '<i class="fa-solid fa-lock-open"></i> ระบบกำลังเปิด' : '<i class="fa-solid fa-lock"></i> ระบบถูกปิดอยู่';

        const tempUntil = data.tempOpenUntil ? data.tempOpenUntil.toDate() : null;
        if(tempUntil && tempUntil > new Date()) {
            document.getElementById('tempStatus').innerText = `(เปิดฉุกเฉินถึง: ${tempUntil.toLocaleTimeString('th-TH')} น.)`;
        } else {
            document.getElementById('tempStatus').innerText = "";
        }
    }
});

document.getElementById('toggleSystemBtn').addEventListener('click', async () => {
    await setDoc(doc(db, "system", "settings"), { isOpen: !isSystemOpen }, { merge: true });
});

document.getElementById('tempOpenBtn').addEventListener('click', async () => {
    const mins = parseInt(document.getElementById('tempMins').value);
    if(!mins) return alert('กรุณาระบุนาทีครับ');
    
    const future = new Date();
    future.setMinutes(future.getMinutes() + mins);
    
    await setDoc(doc(db, "system", "settings"), { tempOpenUntil: Timestamp.fromDate(future) }, { merge: true });
    document.getElementById('tempMins').value = '';
    alert(`เปิดระบบชั่วคราว ${mins} นาทีเรียบร้อย!`);
});

function loadStudents() {
    onSnapshot(collection(db, "students"), (snapshot) => {
        const tbody = document.getElementById('studentSettingList');
        let students = [];
        snapshot.forEach(doc => { students.push({ id: doc.id, ...doc.data() }); });
        
        students.sort((a, b) => a.number - b.number);
        
        let html = '';
        students.forEach(d => {
            html += `<tr class="border-b hover:bg-gray-50">
                <td class="p-2 text-center font-bold text-gray-700">${d.number}</td>
                <td class="p-2 text-sm text-gray-500">${d.code || '-'}</td>
                <td class="p-2 font-medium">${d.name}</td>
                <td class="p-2 text-center">
                    <button onclick="editStudent('${d.id}', ${d.number}, '${d.code || ''}', '${d.name}')" class="text-blue-500 mr-3 hover:text-blue-700"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteDocItem('students', '${d.id}')" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    });
}

window.editStudent = (docId, num, code, name) => {
    document.getElementById('editDocId').value = docId;
    document.getElementById('newStdId').value = num;
    document.getElementById('newStdCode').value = code;
    document.getElementById('newStdName').value = name;
    
    const btn = document.getElementById('saveStdBtn');
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> อัปเดตข้อมูล';
    btn.classList.replace('bg-blue-600', 'bg-green-600');
};

window.resetForm = () => {
    document.getElementById('editDocId').value = '';
    document.getElementById('newStdId').value = '';
    document.getElementById('newStdCode').value = '';
    document.getElementById('newStdName').value = '';
    
    const btn = document.getElementById('saveStdBtn');
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> บันทึก';
    btn.classList.replace('bg-green-600', 'bg-blue-600');
};

document.getElementById('saveStdBtn').addEventListener('click', async () => {
    const docId = document.getElementById('editDocId').value;
    const num = document.getElementById('newStdId').value;
    const code = document.getElementById('newStdCode').value;
    const name = document.getElementById('newStdName').value;
    
    if(!num || !name) { alert('กรุณาใส่เลขที่และชื่อให้ครบครับ'); return; }
    
    const targetId = docId ? docId : `std_${Date.now()}`;
    await setDoc(doc(db, "students", targetId), { number: parseInt(num), code: code, name: name });
    resetForm();
});

window.downloadTemplate = function() {
    const ws_data = [ ['เลขที่', 'รหัสนักเรียน', 'ชื่อ-นามสกุล'], [1, '69001', 'ด.ช. สมชาย รักดี'] ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อนักเรียน");
    XLSX.writeFile(wb, "ฟอร์มเพิ่มรายชื่อนักเรียน.xlsx");
};

document.getElementById('excelUpload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if(!file) return;

    if(!confirm('ตรวจสอบไฟล์ถูกต้องแล้วใช่หรือไม่?')) { e.target.value = ''; return; }

    const lbl = document.getElementById('uploadLabel');
    lbl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...';

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            let count = 0;
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                if(row['เลขที่'] && row['ชื่อ-นามสกุล']) {
                    await setDoc(doc(db, "students", `std_${Date.now()}_${i}`), { 
                        number: parseInt(row['เลขที่']), code: String(row['รหัสนักเรียน'] || ''), name: String(row['ชื่อ-นามสกุล']) 
                    });
                    count++;
                }
            }
            alert(`นำเข้าข้อมูลสำเร็จ ${count} รายชื่อ!`);
        } catch (err) { alert('เกิดข้อผิดพลาด กรุณาเช็คฟอร์มอีกครั้งครับ'); }
        document.getElementById('excelUpload').value = '';
        lbl.innerHTML = '<i class="fa-solid fa-file-excel mr-1"></i> นำเข้าข้อมูล';
    };
    reader.readAsArrayBuffer(file);
});

// 🟢 ระบบจัดการผู้บันทึก (Checkers)
function loadCheckers() {
    onSnapshot(collection(db, "checkers"), (snapshot) => {
        const tbody = document.getElementById('checkerSettingList');
        let html = '';
        snapshot.forEach(doc => {
            html += `<tr class="border-b hover:bg-gray-50">
                <td class="p-2 font-medium">${doc.data().name}</td>
                <td class="p-2 text-center">
                    <button onclick="deleteDocItem('checkers', '${doc.id}')" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
        if(html === '') html = '<tr><td colspan="2" class="text-center p-4 text-gray-500">ยังไม่มีรายชื่อผู้บันทึก</td></tr>';
        tbody.innerHTML = html;
    });
}

document.getElementById('addCheckerBtn').addEventListener('click', async () => {
    const name = document.getElementById('newCheckerName').value;
    if(!name) { alert('กรุณาใส่ชื่อผู้บันทึกครับ'); return; }
    await setDoc(doc(db, "checkers", `chk_${Date.now()}`), { name: name });
    document.getElementById('newCheckerName').value = '';
});

// 🟢 ระบบจัดการแอดมิน
function loadSystemUsers() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        const tbody = document.getElementById('userSettingList');
        let html = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            let roleTh = d.role === 'admin' ? 'แอดมิน' : d.role === 'teacher' ? 'ครู' : 'นักเรียน';
            html += `<tr class="border-b"><td class="p-2">${d.name}</td><td class="p-2">${d.username}</td><td class="p-2">${roleTh}</td><td class="p-2"><button onclick="deleteDocItem('users', '${doc.id}')" class="text-red-500"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
        tbody.innerHTML = html;
    });
}

document.getElementById('addUserBtn').addEventListener('click', async () => {
    const name = document.getElementById('newUserName').value;
    const user = document.getElementById('newUserLogin').value;
    const pass = document.getElementById('newUserPass').value;
    const role = document.getElementById('newUserRole').value;
    
    if(name && user && pass) {
        await setDoc(doc(db, "users", user), { name, username: user, password: pass, role });
        document.getElementById('newUserName').value = '';
        document.getElementById('newUserLogin').value = '';
        document.getElementById('newUserPass').value = '';
    } else { alert('กรุณากรอกข้อมูลให้ครบถ้วน'); }
});

window.deleteDocItem = async function(collectionName, docId) {
    if(confirm('ยืนยันการลบข้อมูลนี้ใช่หรือไม่?')) {
        await deleteDoc(doc(db, collectionName, docId));
    }
}

loadStudents();
loadCheckers(); // เรียกใช้ฟังก์ชันดึงผู้บันทึก