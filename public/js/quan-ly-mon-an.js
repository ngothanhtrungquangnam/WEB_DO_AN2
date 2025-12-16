document.addEventListener('DOMContentLoaded', () => {
    // === 1. LẤY CÁC PHẦN TỬ HTML (ĐÚNG ID VỚI HTML MỚI) ===
    const monAnListContainer = document.getElementById('mon-an-list-container');
    const addForm = document.getElementById('add-mon-an-form');
    
    // Các trường nhập liệu
    const monIdInput = document.getElementById('mon-id');
    const monNameInput = document.getElementById('mon-name');
    const monPriceInput = document.getElementById('mon-price');
    const monImageInput = document.getElementById('mon-image');
    
    // 🔥 QUAN TRỌNG: Lấy đúng thẻ SELECT mới sửa
    const monCategoryInput = document.getElementById('mon-category'); 

    // Các nút bấm
    const submitBtn = addForm.querySelector('button[type="submit"]');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    // Lấy thông tin đăng nhập
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = userInfo ? userInfo.token : null;
    const userRole = userInfo ? userInfo.role : null;

    // === 2. HÀM TẢI DANH SÁCH MÓN ĂN ===
    async function loadMonAn() {
        try {
            const res = await fetch('/api/mon-an'); 
            if (!res.ok) throw new Error(`Lỗi tải: ${res.status}`);
            
            const monAns = await res.json();
            monAnListContainer.innerHTML = ''; 

            if (monAns.length === 0) {
                monAnListContainer.innerHTML = `<tr><td colspan="5" style="text-align:center;">Chưa có món ăn nào.</td></tr>`;
                return;
            }

            monAns.forEach(mon => {
                const row = document.createElement('tr');
                
                // Hiển thị nhãn Flash Sale nếu có
                const categoryDisplay = mon.category === 'flash-sale' 
                    ? '<span style="color:red; font-weight:bold;">⚡ Flash Sale</span>' 
                    : mon.category;

                row.innerHTML = `
                    <td>
                        <img src="${mon.image}" alt="${mon.name}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
                    </td>
                    <td>${mon.name}</td>
                    <td>${mon.price.toLocaleString('vi-VN')} VND</td>
                    <td>${categoryDisplay}</td>
                    <td>
                        <button class="btn-delete edit-btn" 
                            style="background-color: #3498db; margin-right: 5px; cursor: pointer;" 
                            data-id="${mon._id}" 
                            data-name="${mon.name}" 
                            data-price="${mon.price}"
                            data-image="${mon.image}"
                            data-category="${mon.category}">Sửa</button>
                        
                        <button class="btn-delete delete-btn" 
                            style="cursor: pointer;"
                            data-id="${mon._id}">Xóa</button>
                    </td>
                `;
                monAnListContainer.appendChild(row);
            });

        } catch (error) {
            console.error('Lỗi tải món:', error);
            monAnListContainer.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    }

    // === 3. HÀM RESET FORM (Về trạng thái Thêm mới) ===
    function resetForm() {
        monIdInput.value = ''; // Xóa ID ẩn
        addForm.reset();       // Xóa trắng ô nhập
        monCategoryInput.value = ""; // Reset select về mặc định
        
        submitBtn.textContent = 'Thêm món'; 
        submitBtn.classList.remove('btn-warning');
        submitBtn.classList.add('btn-primary');
        
        cancelBtn.style.display = 'none'; // Ẩn nút Hủy
    }
    
    if(cancelBtn) cancelBtn.addEventListener('click', resetForm);

    // === 4. XỬ LÝ SUBMIT FORM (THÊM HOẶC SỬA) ===
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const monAnId = monIdInput.value; // Lấy ID (nếu có là Sửa, không có là Thêm)
        
        const monAnData = {
            name: monNameInput.value.trim(),
            price: parseInt(monPriceInput.value),
            image: monImageInput.value.trim(),
            category: monCategoryInput.value // Lấy giá trị từ thẻ Select
        };

        if(!monAnData.category) {
            alert("Vui lòng chọn loại món ăn!");
            return;
        }

        try {
            let res;
            if (monAnId) {
                // --- LOGIC SỬA (PUT) ---
                res = await fetch(`/api/mon-an/${monAnId}`, { 
                    method: 'PUT', 
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(monAnData)
                });
                if (!res.ok) throw new Error('Cập nhật thất bại');
                alert('Cập nhật thành công!');

            } else {
                // --- LOGIC THÊM MỚI (POST) ---
                res = await fetch('/api/mon-an', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(monAnData)
                });
                if (!res.ok) throw new Error('Thêm thất bại');
                alert('Thêm món thành công!');
            }
            
            resetForm(); 
            loadMonAn(); 

        } catch (error) {
            console.error('Lỗi submit:', error);
            alert('Lỗi: ' + error.message);
        }
    });

    // === 5. XỬ LÝ CLICK NÚT SỬA / XÓA TRÊN DANH SÁCH ===
    monAnListContainer.addEventListener('click', async (e) => {
        const target = e.target; 

        // --- NÚT SỬA ---
        if (target.classList.contains('edit-btn')) {
            // Lấy data từ nút bấm
            const id = target.dataset.id;
            const name = target.dataset.name;
            const price = target.dataset.price;
            const image = target.dataset.image;
            const category = target.dataset.category;

            // Đổ lại vào Form
            monIdInput.value = id;
            monNameInput.value = name;
            monPriceInput.value = price;
            monImageInput.value = image;
            monCategoryInput.value = category; // Tự động chọn đúng option trong select

            // Đổi giao diện sang chế độ Sửa
            submitBtn.textContent = 'Lưu thay đổi';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-warning'); // Đổi màu nút cho dễ nhìn
            cancelBtn.style.display = 'inline-block'; // Hiện nút Hủy
            
            // Cuộn lên đầu
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // --- NÚT XÓA ---
        if (target.classList.contains('delete-btn')) {
            const monAnId = target.dataset.id;
            
            if (!confirm('Bạn có chắc chắn muốn xóa món này?')) return;

            try {
                const res = await fetch(`/api/mon-an/${monAnId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Xóa thất bại');

                alert('Đã xóa món ăn!');
                loadMonAn(); 

            } catch (error) {
                console.error('Lỗi xóa:', error);
                alert('Lỗi: ' + error.message);
            }
        }
    });

    // === 6. KIỂM TRA QUYỀN VÀ TẢI TRANG ===
    if (!token || userRole !== 'admin') { 
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = '/login.html'; // Đá về trang login nếu không phải admin
    } else {
        loadMonAn(); 
    }
});