// Chờ cho toàn bộ nội dung trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    // === LẤY CÁC PHẦN TỬ HTML ===
    const monAnListContainer = document.getElementById('mon-an-list-container');
    const addForm = document.getElementById('add-mon-an-form');
    
    // [MỚI] Lấy các trường input của form để Sửa
    const monIdInput = document.getElementById('mon-id');
    const monNameInput = document.getElementById('mon-name');
    const monPriceInput = document.getElementById('mon-price');
    const monImageInput = document.getElementById('mon-image');
    const monCategoryInput = document.getElementById('mon-category');
    // [MỚI] Lấy nút submit và nút hủy
    const submitBtn = addForm.querySelector('button[type="submit"]');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    // [GIỮ NGUYÊN] Lấy token và vai trò (Phần này đã đúng)
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = userInfo ? userInfo.token : null;
    const userRole = userInfo ? userInfo.role : null;

    // === [SỬA ĐỔI] HÀM 1: Tải và hiển thị món ăn (Thêm nút "Sửa") ===
    async function loadMonAn() {
        try {
            const res = await fetch('/api/mon-an'); // Giữ nguyên đường dẫn đúng
            if (!res.ok) throw new Error(`Không thể tải món ăn (Lỗi: ${res.status})`);
            
            const monAns = await res.json();
            monAnListContainer.innerHTML = ''; 

            if (monAns.length === 0) {
                monAnListContainer.innerHTML = `<tr><td colspan="5" style="text-align:center;">Chưa có món ăn nào.</td></tr>`;
                return;
            }

            monAns.forEach(mon => {
                const row = document.createElement('tr');
                
             // [SỬA LẠI KHỐI NÀY]
row.innerHTML = `
    <td>
        <img src="${mon.image}" alt="${mon.name}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
    </td>
    <td>${mon.name}</td>
    <td>${mon.price.toLocaleString('vi-VN')} VND</td>
    <td>${mon.category}</td>
    <td>
        <button class="btn-delete edit-btn" 
            style="background-color: #3498db; margin-right: 5px;" 
            data-id="${mon._id}" 
            data-name="${mon.name}" 
            data-price="${mon.price}"
            data-image="${mon.image}"
            data-category="${mon.category}">Sửa</button>
        
        <button class="btn-delete delete-btn" data-id="${mon._id}">Xóa</button>
    </td>
`;
                monAnListContainer.appendChild(row);
            });

        } catch (error) {
            console.error('Lỗi khi tải món ăn:', error);
            if (monAnListContainer) {
                 monAnListContainer.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">${error.message}</td></tr>`;
            }
        }
    }

    // === [MỚI] HÀM 2: Reset (làm mới) form ===
    function resetForm() {
        monIdInput.value = ''; // Xóa ID ẩn
        addForm.reset(); // Xóa các giá trị trong form
        submitBtn.textContent = 'Thêm món'; // Đặt lại tên nút
        cancelBtn.style.display = 'none'; // Ẩn nút Hủy
    }
    
    // [MỚI] Gán sự kiện cho nút Hủy
    cancelBtn.addEventListener('click', resetForm);

    // === [SỬA ĐỔI] HÀM 3: Xử lý Submit Form (Kiểm tra Thêm Mới hay Cập Nhật) ===
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const monAnId = monIdInput.value; // Lấy ID từ trường ẩn
        
        const monAnData = {
            name: monNameInput.value,
            price: parseInt(monPriceInput.value),
            image: monImageInput.value,
            category: monCategoryInput.value,
        };

        try {
            let res;
            if (monAnId) {
                // *** [MỚI] LOGIC CẬP NHẬT (UPDATE - PUT) ***
                res = await fetch(`/api/mon-an/${monAnId}`, { 
                    method: 'PUT', // Dùng PUT để cập nhật
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(monAnData)
                });
                if (!res.ok) throw new Error(`Cập nhật món ăn thất bại (Lỗi: ${res.status})`);
                alert('Cập nhật món ăn thành công!');

            } else {
                // *** [GIỮ NGUYÊN] LOGIC THÊM MỚI (CREATE - POST) ***
                res = await fetch('/api/mon-an', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(monAnData)
                });
                if (!res.ok) throw new Error(`Thêm món ăn thất bại (Lỗi: ${res.status})`);
                alert('Thêm món ăn thành công!');
            }
            
            resetForm(); // Làm mới form sau khi thành công
            loadMonAn(); // Tải lại danh sách

        } catch (error) {
            console.error('Lỗi khi submit form:', error);
            alert('Lỗi: ' + error.message);
        }
    });

    // === [SỬA ĐỔI] HÀM 4: Xử lý Click trên Danh sách (Xóa hoặc Sửa) ===
    monAnListContainer.addEventListener('click', async (e) => {
        const target = e.target; // Phần tử được click

        // --- [MỚI] Xử lý nút SỬA ---
        if (target.classList.contains('edit-btn')) {
            // Lấy dữ liệu từ các thuộc tính data-* của nút
            const id = target.dataset.id;
            const name = target.dataset.name;
            const price = target.dataset.price;
            const image = target.dataset.image;
            const category = target.dataset.category;

            // Đổ dữ liệu vào form
            monIdInput.value = id;
            monNameInput.value = name;
            monPriceInput.value = price;
            monImageInput.value = image;
            monCategoryInput.value = category;

            // Đổi trạng thái form
            submitBtn.textContent = 'Cập nhật món';
            cancelBtn.style.display = 'block';
            
            // Cuộn lên đầu trang để user thấy form
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // --- [GIỮ NGUYÊN] Xử lý nút XÓA ---
        if (target.classList.contains('delete-btn')) {
            const monAnId = target.dataset.id;
            
            if (!confirm('Bạn có chắc chắn muốn xóa món ăn này?')) {
                return;
            }

            try {
                const res = await fetch(`/api/mon-an/${monAnId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.status === 401 || res.status === 403) {
                    alert('Bạn không có quyền Admin để thực hiện việc này.');
                    return;
                }
                if (!res.ok) throw new Error(`Xóa món ăn thất bại (Lỗi: ${res.status})`);

                alert('Xóa món ăn thành công!');
                loadMonAn(); // Tải lại danh sách

            } catch (error) {
                console.error('Lỗi khi xóa:', error);
                alert('Lỗi: ' + error.message);
            }
        }
    });

    // === [GIỮ NGUYÊN] HÀM 5: Chạy lần đầu khi tải trang ===
    if (!token || userRole !== 'admin') { 
        alert('Vui lòng đăng nhập với tư cách Admin.');
        monAnListContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Bạn cần đăng nhập với tư cách Admin để xem.</td></tr>`;
    } else {
        loadMonAn(); 
    }
});