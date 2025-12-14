// File: public/script.js --- PHIÊN BẢN HOÀN CHỈNH (ĐÃ SỬA LỖI LỌC) ---
// File: script.js
  // Hàm hiển thị Modal/Form Bắt buộc thiết lập mật khẩu
window.showPasswordSetupModal = function(userId, email, token) {
    // 1. Lưu tạm dữ liệu cần thiết
    localStorage.setItem('tempSocialUserId', userId);
    localStorage.setItem('tempSocialToken', token);
    localStorage.setItem('tempSocialEmail', email);

    // 2. Chuyển hướng/Hiện modal
    // Tạo một modal/div mới trong index.html với id="password-setup-modal"
    const setupModal = document.getElementById('password-setup-modal');
    if (setupModal) {
        // Nếu dùng Modal: Hiển thị Modal yêu cầu người dùng nhập mật khẩu mới
        setupModal.style.display = 'flex'; 
        alert(`Chào mừng! Vui lòng thiết lập mật khẩu để bảo mật tài khoản ${email}.`);
    } else {
        // Nếu chưa kịp tạo Modal, chuyển hướng sang trang setup riêng
        // window.location.href = '/setup-password.html'; // Tùy chọn
        
        // TẠM THỜI: Hiện alert báo lỗi để biết cần tạo Modal
        console.error("Thiếu Modal thiết lập mật khẩu!");
        alert("Lỗi: Không tìm thấy giao diện thiết lập mật khẩu. Vui lòng thử lại sau.");
    }
}
// TÀI KHOẢN MÔ PHỎNG (Giả lập database)
const MOCK_USERS = {
    "admin": { password: "admin", role: "admin" },
    "user": { password: "user", role: "customer" }
};
document.addEventListener("DOMContentLoaded", () => {
    // --- KHAI BÁO BIẾN ---
    const menuContainer = document.getElementById('menuContainer');
    const searchBox = document.getElementById('searchBox');
    const categoryFilter = document.getElementById('categoryFilter');
    const darkToggle = document.querySelector('.dark-toggle');
    const cartContainer = document.getElementById("cartContainer"); // Trang order
    const checkoutContainer = document.getElementById("checkoutContainer"); // Trang order
    const orderTableBody = document.querySelector("#orderTable tbody"); // Trang admin
    const addItemForm = document.getElementById('add-item-form'); // Trang ql thực đơn
    const menuTableBody = document.getElementById('menu-table-body'); // Trang ql thực đơn
    const authButton = document.getElementById('auth-button'); // Nút Đăng nhập/xuất
    const adminLinks = document.getElementById('admin-links'); // Link chỉ admin thấy

    let currentMenuItems = []; // QUAN TRỌNG: Đây là mảng lưu trữ menu từ API

    // File: script.js

    // --- LẤY THÔNG TIN USER TỪ LOCALSTORAGE ---
    const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;

   

    // =============================================
    // CHỨC NĂNG CHUNG: NAVBAR AUTHENTICATION
    // =============================================
    function setupNavbar() {
        if (!authButton) return; 

        if (userInfo) {
            authButton.innerHTML = `<i class="bi bi-box-arrow-right"></i> Đăng xuất (${userInfo.username})`;
      authButton.onclick = () => {
    // 👇 --- CODE THÊM MỚI --- 👇
    try {
        const rawData = localStorage.getItem('userInfo');
        if (rawData) {
            const data = JSON.parse(rawData);
            const userId = data.userId || data._id || data.id; 
            if (userId) localStorage.removeItem(`chatHistory_${userId}`);
        }
    } catch (e) { console.error(e); }
    // 👆 --- KẾT THÚC --- 👆

    localStorage.removeItem('userInfo'); 
    alert('Bạn đã đăng xuất.');
    window.location.href = '/login.html'; 
};
            if (userInfo.role === 'admin' && adminLinks) {
                adminLinks.style.display = 'inline'; 
            } else if (adminLinks) {
                adminLinks.style.display = 'none'; 
            }
        } else {
            authButton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Đăng nhập';
            authButton.onclick = () => {
                window.location.href = '/login.html'; 
            };
            if (adminLinks) {
                adminLinks.style.display = 'none'; 
            }
        }
    }
    setupNavbar(); 

    // =============================================
    // TRANG CHỦ / MENU (index.html)
    // =============================================
    if (menuContainer && searchBox && categoryFilter) { 
        
        async function fetchMenu() {
            try {
                const response = await fetch('/api/mon-an'); 
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                currentMenuItems = await response.json(); // Lưu dữ liệu API vào đây
                if (!Array.isArray(currentMenuItems)) { 
                   currentMenuItems = []; 
                }
                renderMenu(currentMenuItems); // Hiển thị tất cả ban đầu
            } catch (error) {
                console.error("Lỗi tải menu:", error);
                menuContainer.innerHTML = '<p class="no-results" style="text-align: center; width: 100%;">Lỗi tải thực đơn. Vui lòng thử lại.</p>';
            }
        }

 window.allMenuItems = []; // tạo biến toàn cục
function renderMenu(items) {
    menuContainer.innerHTML = "";
    if (!items || items.length === 0) {
        menuContainer.innerHTML = '<p class="no-results" style="text-align: center; width: 100%;">Không có món ăn nào.</p>';
        return;
    }

    // 👉 Lưu danh sách món ăn vào localStorage để addToClientCart dùng
    localStorage.setItem("menuData", JSON.stringify(items));

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${item.image || 'placeholder.jpg'}" alt="${item.name}"> 
            <div class="card-content">
                <h3>${item.name}</h3>
                <p class="category">${item.category}</p>
                <p class="price"><b>${item.price.toLocaleString('vi-VN')} VND</b></p>
                <button class="btn" onclick="addToClientCart('${item._id}')">Thêm vào giỏ</button> 
            </div>`;
        menuContainer.appendChild(card);
    });
}


                    // --- Lọc và tìm kiếm (ĐÃ SỬA LỖI LOGIC LỌC) ---
// --- Lọc và tìm kiếm (PHIÊN BẢN SỬA LỖI CUỐI CÙNG) ---
// --- Lọc và tìm kiếm (ĐÃ SỬA LỖI CHÍNH TẢ) ---
function filterAndSearchMenu() {
    if (!searchBox || !categoryFilter) return; 

    const keyword = searchBox.value.toLowerCase().trim();
    // Chuyển giá trị chọn về chữ thường và bỏ khoảng trắng
    const selectedCategory = categoryFilter.value.toLowerCase().trim(); 

    const filteredItems = currentMenuItems.filter(item => { 
        const nameMatch = item.name.toLowerCase().includes(keyword);
        
        // Chuyển category của món ăn về chữ thường và bỏ khoảng trắng
        const itemCategory = item.category ? item.category.toLowerCase().trim() : '';
        
        // --- SỬA LỖI CHÍNH TẢ Ở ĐÂY ---
        // So sánh hai giá trị đã được làm sạch
        const categoryMatch = (selectedCategory === "all" || itemCategory === selectedCategory); 
        // -----------------------------

        return nameMatch && categoryMatch;
    });

    renderMenu(filteredItems); // Hiển thị kết quả đã lọc
}
        // Gắn sự kiện
        searchBox.addEventListener("input", filterAndSearchMenu);
        categoryFilter.addEventListener("change", filterAndSearchMenu);

        // Tải menu lần đầu
        fetchMenu();
    }

    // =============================================
    // GIỎ HÀNG (Lưu trên Client bằng localStorage)
    // =============================================
   // THAY THẾ HÀM CŨ BẰNG HÀM MỚI NÀY


    // =============================================
    // TRANG ĐẶT MÓN (order.html)
    // =============================================
    if (cartContainer && checkoutContainer) {
        function renderOrderPageCart() {
            const cart = JSON.parse(localStorage.getItem("clientCart")) || [];
            cartContainer.innerHTML = "<h2>🛒 Giỏ hàng của bạn</h2>";
            
            if (cart.length === 0) {
                cartContainer.innerHTML += "<p>Chưa có món nào trong giỏ hàng.</p>";
                checkoutContainer.innerHTML = ""; 
                return;
            }

            let total = 0;
            cart.forEach((item, index) => {
                const itemTotal = item.price * (item.qty || 1);
                total += itemTotal;

                const cartItemDiv = document.createElement("div");
                cartItemDiv.className = "cart-item";
                cartItemDiv.innerHTML = `
                     <img src="${item.img || 'placeholder.jpg'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${(item.qty || 1)} x ${item.price.toLocaleString('vi-VN')} VND</p>
                    </div>
                    <div class="cart-item-actions">
                        <span class="item-total-price">${itemTotal.toLocaleString('vi-VN')} VND</span>
                        <button class="btn-remove" onclick="removeItemFromClientCart(${index})"><i class="bi bi-trash3"></i> Xóa</button>
                    </div>
                `;
                cartContainer.appendChild(cartItemDiv);
            });

            checkoutContainer.innerHTML = `
                <div class="checkout-summary">
                    <h3><span>Tổng cộng:</span> <span>${total.toLocaleString('vi-VN')} VND</span></h3>
                    <input type="text" id="customerName" placeholder="Nhập tên của bạn hoặc số bàn" required>
                    <button class="btn" onclick="submitClientOrder()">Gửi Đơn Hàng</button>
                    <div id="orderError" style="color: #e74c3c; margin-top: 10px; display: none;"></div>
                </div>`;
        }
        renderOrderPageCart();
    }
    
    // =============================================
    // TRANG QUẢN LÝ ĐƠN HÀNG (admin.html)
    // =============================================
     if (orderTableBody) { 
         if (!userInfo || userInfo.role !== 'admin') {
             document.body.innerHTML = '<h1>Bạn không có quyền truy cập trang này.</h1><p><a href="/login.html">Đăng nhập với tài khoản Admin</a></p>';
             return; // Dừng thực thi script
         }
        
        async function fetchAdminOrders() {
            try {
                const response = await fetch('/api/don-hang', {
                    headers: { 'Authorization': `Bearer ${userInfo.token}` }
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                         alert('Phiên đăng nhập hết hạn hoặc không có quyền.');
                         localStorage.removeItem('userInfo');
                         window.location.href = '/login.html';
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const orders = await response.json();
                renderAdminOrders(orders);
            } catch (error) {
                console.error("Lỗi tải đơn hàng admin:", error);
                orderTableBody.innerHTML = `<tr><td colspan="5">Lỗi tải đơn hàng: ${error.message}</td></tr>`;
            }
        }

        function renderAdminOrders(orders) {
            orderTableBody.innerHTML = "";
            if (!orders || orders.length === 0) {
                orderTableBody.innerHTML = "<tr><td colspan='5'>Chưa có đơn hàng nào.</td></tr>";
                return;
            }

            orders.forEach((order) => {
                 const itemsHtml = order.items && Array.isArray(order.items)
                    ? order.items.map(item =>
                        `<li>${item.itemId ? item.itemId.name : `ID:${item.itemId}`} (x${item.quantity})</li>`
                      ).join('')
                    : '<li>Lỗi dữ liệu món ăn</li>';

                const tr = document.createElement("tr");
                tr.className = `status-${order.status.replace(/\s+/g, '-').toLowerCase()}`;
                tr.innerHTML = `
                    <td>${order.customerName}</td>
                    <td><ul>${itemsHtml}</ul></td>
                    <td>${order.totalPrice ? order.totalPrice.toLocaleString('vi-VN') : 'N/A'} VND</td>
                    <td>${order.status}</td>
                    <td>
                        <button class="btn-action btn-approve" ${order.status === 'Đang xử lý' ? 'disabled' : ''} onclick="updateOrderStatusAdmin('${order._id}', 'Đang xử lý')">⏳ Xử lý</button>
                        <button class="btn-action btn-complete" ${order.status === 'Hoàn thành' ? 'disabled' : ''} onclick="updateOrderStatusAdmin('${order._id}', 'Hoàn thành')">✅ Hoàn thành</button>
                        <button class="btn-action btn-cancel" ${order.status === 'Đã hủy' ? 'disabled' : ''} onclick="updateOrderStatusAdmin('${order._id}', 'Đã hủy')">❌ Hủy</button>
                    </td>`;
                orderTableBody.appendChild(tr);
            });
        }

        fetchAdminOrders(); // Tải lần đầu

        // Lắng nghe sự kiện real-time từ server
        try {
           const socket = io('https://web-do-an2.onrender.com');
            socket.on('connect', () => console.log('Admin connected to Socket.IO'));
            socket.on('new_order', (newOrder) => {
                console.log('Admin nhận đơn mới:', newOrder);
                fetchAdminOrders(); 
            });
            socket.on('order_updated', (updatedOrder) => {
                console.log('Admin nhận đơn cập nhật:', updatedOrder);
                fetchAdminOrders(); 
            });
        } catch (e) {
            console.warn("Không thể kết nối Socket.IO. Cập nhật real-time sẽ không hoạt động.", e.message);
        }

    } 

    // =============================================
    // TRANG QUẢN LÝ THỰC ĐƠN (quan-ly-thuc-don.html)
    // =============================================
    if (addItemForm) { 
        if (!userInfo || userInfo.role !== 'admin') {
             document.body.innerHTML = '<h1>Bạn không có quyền truy cập trang này.</h1><p><a href="/login.html">Đăng nhập với tài khoản Admin</a></p>';
             return; 
        }
        
        async function fetchAdminMenu() {
            try {
                 const response = await fetch('/api/mon-an'); 
                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                 const menu = await response.json();
                 renderAdminMenu(menu);
            } catch (error) {
                 console.error("Lỗi tải menu admin:", error);
                 if (menuTableBody) menuTableBody.innerHTML = `<tr><td colspan="4">Lỗi tải thực đơn: ${error.message}</td></tr>`;
            }
        }

        function renderAdminMenu(menu) {
             if (!menuTableBody) return;
             menuTableBody.innerHTML = '';
             if (!menu || menu.length === 0) {
                 menuTableBody.innerHTML = '<tr><td colspan="4">Chưa có món ăn nào.</td></tr>';
                 return;
             }
             menu.forEach(item => {
                 const row = document.createElement('tr');
                 row.innerHTML = `
                    <td><img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
                    <td>${item.name}</td>
                    <td>${item.price.toLocaleString('vi-VN')} VND</td>
                    <td>${item.category}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editMenuItem('${item._id}', '${item.name}', ${item.price}, '${item.image}', '${item.category}')">Sửa</button> 
                        <button class="btn-action btn-delete" onclick="deleteMenuItem('${item._id}')">Xóa</button>
                    </td>
                `;
                 menuTableBody.appendChild(row);
             });
        }

        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newItem = {
                name: document.getElementById('name').value.trim(),
                price: parseInt(document.getElementById('price').value),
                image: document.getElementById('image').value.trim(),
                category: document.getElementById('category').value.trim(),
            };

            if (!newItem.name || !newItem.price || !newItem.image || !newItem.category) { return alert('Vui lòng điền đủ thông tin.'); }
            if (isNaN(newItem.price) || newItem.price < 0) { return alert('Giá tiền không hợp lệ.'); }

            const editingItemId = addItemForm.dataset.editingId;
            const apiUrl = editingItemId ? `/api/mon-an/${editingItemId}` : '/api/mon-an';
            const apiMethod = editingItemId ? 'PATCH' : 'POST';

            try {
                const response = await fetch(apiUrl, {
                    method: apiMethod,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userInfo.token}`
                    },
                    body: JSON.stringify(newItem)
                });
                 if (!response.ok) {
                     const errData = await response.json();
                     throw new Error(errData.message || (editingItemId ? 'Sửa' : 'Thêm') + ' món thất bại');
                 }
                addItemForm.reset();
                delete addItemForm.dataset.editingId; 
                document.querySelector('#add-item-form button[type="submit"]').textContent = 'Thêm Món'; 
                fetchAdminMenu();
                alert((editingItemId ? 'Sửa' : 'Thêm') + ' món ăn thành công!');
            } catch(error) {
                 console.error("Lỗi lưu món:", error);
                 alert(`Lỗi ${editingItemId ? 'sửa' : 'thêm'} món ăn: ${error.message}`);
            }
        });

        fetchAdminMenu(); // Tải lần đầu
    }
   

}); // Kết thúc DOMContentLoaded

// ==========================================================
// CÁC HÀM TOÀN CỤC (để onclick có thể gọi)
// ==========================================================
window.removeItemFromClientCart = function(index) {
    let cart = JSON.parse(localStorage.getItem("clientCart")) || [];
    cart.splice(index, 1);
    localStorage.setItem("clientCart", JSON.stringify(cart));
    // Tải lại trang order để cập nhật giỏ hàng và tổng tiền
    if (document.getElementById("cartContainer")) {
        location.reload(); // Cách đơn giản nhất
    }
}

window.submitClientOrder = async function() {
    const customerNameInput = document.getElementById("customerName");
    const orderError = document.getElementById("orderError");
    if (!customerNameInput || !orderError) return;

    const customerName = customerNameInput.value.trim();
    if (!customerName) {
        alert("Vui lòng nhập tên hoặc số bàn!");
        customerNameInput.focus();
        return;
    }

    const cart = JSON.parse(localStorage.getItem("clientCart")) || [];
    if (cart.length === 0) {
        alert("Giỏ hàng của bạn đang trống!");
        return;
    }

    const orderItems = cart.map(item => ({ itemId: item._id, quantity: item.qty }));
    orderError.style.display = 'none';

    try {
        const response = await fetch('/api/don-hang', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerName, items: orderItems })
        });
        const data = await response.json();

        if (response.status === 201) {
            localStorage.removeItem("clientCart"); 
            alert("Đặt hàng thành công! Cảm ơn bạn.");
            window.location.href = "/"; 
        } else {
             orderError.textContent = data.message || 'Gửi đơn hàng thất bại.';
             orderError.style.display = 'block';
        }
    } catch(error) {
        console.error("Lỗi gửi đơn hàng:", error);
        orderError.textContent = 'Lỗi kết nối server. Vui lòng thử lại.';
        orderError.style.display = 'block';
    }
}


// ==========================================================
// 🔥 XỬ LÝ SUBMIT FORM THIẾT LẬP MẬT KHẨU (TỪ MODAL) 🔥
// ==========================================================
window.submitPasswordSetup = async function() {
    const newPassword = document.getElementById('setup-password-input').value;
    const confirmPassword = document.getElementById('setup-confirm-input').value;

    if (!newPassword || newPassword.length < 6) {
        return alert("Mật khẩu phải có ít nhất 6 ký tự.");
    }
    if (newPassword !== confirmPassword) {
        return alert("Mật khẩu xác nhận không khớp.");
    }

    // Lấy thông tin đã lưu tạm khi đăng ký Social
    const userId = localStorage.getItem('tempSocialUserId');
    const token = localStorage.getItem('tempSocialToken');
    
    if (!userId || !token) {
        return alert("Lỗi phiên: Vui lòng đăng nhập lại bằng Google/SĐT.");
    }

    try {
        const response = await fetch('/api/auth/set-initial-password', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Có thể cần Token cho bảo mật
            },
            body: JSON.stringify({ userId, newPassword })
        });
        
        const data = await response.json();

        if (response.ok) {
            alert("Thiết lập mật khẩu thành công! Bạn có thể đăng nhập thủ công ngay bây giờ.");
            
            // Dọn dẹp dữ liệu tạm và tải lại trang để hoàn tất đăng nhập
            localStorage.removeItem('tempSocialUserId');
            localStorage.removeItem('tempSocialToken');
            localStorage.removeItem('tempSocialEmail');
            
            // Ẩn modal
            const setupModal = document.getElementById('password-setup-modal');
            if (setupModal) setupModal.style.display = 'none';

            // Chuyển về trang chủ hoặc tải lại navbar
            window.location.href = '/index.html'; 
            
        } else {
            alert("Lỗi Server khi thiết lập mật khẩu: " + (data.message || "Thất bại."));
        }
    } catch (error) {
        console.error("Lỗi gọi API thiết lập mật khẩu:", error);
        alert("Lỗi kết nối Server.");
    }
}

window.updateOrderStatusAdmin = async function(orderId, newStatus) {
     const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;
     if (!userInfo || !userInfo.token) return alert('Vui lòng đăng nhập lại.');
     try {
         const response = await fetch(`/api/don-hang/${orderId}`, {
             method: 'PATCH',
             headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${userInfo.token}` 
             },
             body: JSON.stringify({ status: newStatus })
         });
         if (!response.ok) {
             const errData = await response.json();
             throw new Error(errData.message || 'Cập nhật thất bại');
         }
         // Socket.IO sẽ tự động cập nhật, nếu không có, cần fetch lại
         if (typeof io === 'undefined' && document.querySelector("#orderTable tbody")) {
             // Phải gọi hàm fetchAdminOrders, nhưng nó nằm trong scope DOMContentLoaded
             // Tạm thời reload
             location.reload();
         }
     } catch(error) {
         console.error("Lỗi cập nhật status:", error);
         alert(`Lỗi cập nhật trạng thái: ${error.message}`);
     }
}

window.deleteMenuItem = async function(id) {
     const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;
     if (!userInfo || !userInfo.token) return alert('Vui lòng đăng nhập lại.');
     if (confirm('Bạn có chắc chắn muốn xóa món ăn này không?')) {
        try {
             const response = await fetch(`/api/mon-an/${id}`, { 
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${userInfo.token}` } 
             });
             if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.message || 'Xóa thất bại');
             }
             alert('Xóa món ăn thành công!');
             if (document.getElementById('add-item-form')) {
                 location.reload(); // Tạm thời reload
             }
         } catch(error) {
             console.error("Lỗi xóa món:", error);
             alert(`Lỗi xóa món ăn: ${error.message}`);
         }
     }
}

window.editMenuItem = function(id, name, price, image, category) {
     const addItemForm = document.getElementById('add-item-form');
     if (!addItemForm) return;
     
     document.getElementById('name').value = name;
     document.getElementById('price').value = price;
     document.getElementById('image').value = image;
     document.getElementById('category').value = category;
     
     addItemForm.dataset.editingId = id;
     document.querySelector('#add-item-form button[type="submit"]').textContent = 'Lưu Thay Đổi';
     
     addItemForm.scrollIntoView({ behavior: 'smooth' });
}

function addToClientCart(id) {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo || userInfo.role !== "user") {
        showToast("⚠️ Vui lòng đăng nhập tài khoản khách hàng trước khi đặt món!");
        return;
    }

    const menu = JSON.parse(localStorage.getItem("menuData")) || [];
    const item = menu.find(m => m._id === id);
    if (!item) {
        showToast("❌ Món ăn không tồn tại!");
        return;
    }

    let cart = JSON.parse(localStorage.getItem("clientCart")) || [];
    const existing = cart.find(i => i._id === id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    localStorage.setItem("clientCart", JSON.stringify(cart));
    showToast(`✅ Đã thêm "${item.name}" vào giỏ hàng!`);
}

function showToast(message) {
  const toast = document.getElementById("toastMessage");
  if (!toast) return; // tránh lỗi nếu HTML chưa có toast

  toast.textContent = message;
  toast.classList.add("show");

  // Tự ẩn sau 2 giây
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
// ==========================================================
// 🔥 CẬP NHẬT ẢNH QR THEO NGÂN HÀNG (MỚI THÊM) 🔥
// ==========================================================
async function updateQrPaymentImage() {
    // Tìm thẻ ảnh QR trong giao diện (Bạn cần chắc chắn ID này đúng với HTML)
    const qrImg = document.getElementById('checkout-qr-img'); 
    const bankLabel = document.getElementById('checkout-bank-name');

    if (!qrImg) return; // Nếu không có ảnh thì bỏ qua

    try {
        // 1. Gọi API hỏi Server xem đang dùng MB hay BIDV
        const res = await fetch('/api/payment/current-bank');
        const data = await res.json();

        if (data.success && data.bankInfo) {
            const bank = data.bankInfo;
            
            // 2. Tạo link VietQR động
            // Cú pháp: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
            const qrUrl = `https://img.vietqr.io/image/${bank.BANK_ID}-${bank.ACCOUNT_NO}-${bank.TEMPLATE}.png`;
            
            // 3. Cập nhật giao diện
            qrImg.src = qrUrl;
            
            if (bankLabel) {
                bankLabel.innerText = `Ngân hàng: ${bank.BANK_ID} - ${bank.ACCOUNT_NAME}`;
            }
            
            console.log("✅ Đã cập nhật ảnh QR sang:", bank.BANK_ID);
        }
    } catch (e) {
        console.error("Lỗi cập nhật ảnh QR:", e);
    }
}

// Gọi hàm này ngay khi trang web tải xong
    updateQrPaymentImage();

// ==========================================================
// 🔥 LOGIC MODAL ĐĂNG NHẬP / ĐĂNG KÝ (FIX LỖI NAVBAR ĐỘNG) 🔥
// ==========================================================

    // 1. KHAI BÁO BIẾN UI
    const container = document.getElementById('auth-container');
    const authModal = document.getElementById('auth-modal');
    
    // 2. XỬ LÝ HIỆU ỨNG TRƯỢT (Nút trong Modal)
    const signUpBtn = document.getElementById('signUpBtn');
    const signInBtn = document.getElementById('signInBtn');

    if(signUpBtn && signInBtn && container) {
        signUpBtn.addEventListener('click', () => container.classList.add("right-panel-active"));
        signInBtn.addEventListener('click', () => container.classList.remove("right-panel-active"));
    }
// ==========================================================
// 🔥 1. XỬ LÝ KẾT QUẢ FIREBASE REDIRECT (GOOGLE) 🔥 (ĐÃ SỬA LỖI TIMING)
// ==========================================================

// === KẾT THÚC LOGIC REDIRECT ===

    // === KẾT THÚC LOGIC REDIRECT ===
    // 3. XỬ LÝ CLICK NÚT ĐĂNG NHẬP TRÊN NAVBAR (QUAN TRỌNG NHẤT)
    // Dùng document.addEventListener để bắt sự kiện kể cả khi nút chưa tải xong
    document.addEventListener('click', (e) => {
        // Kiểm tra xem người dùng có bấm vào nút có ID là 'authButton' không?
        const navAuthBtn = e.target.closest('#authButton');

        if (navAuthBtn) {
            e.preventDefault(); // 🛑 CHẶN CHUYỂN TRANG
            
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            
            if(userInfo) {
                // NẾU ĐANG CÓ USER -> HỎI ĐĂNG XUẤT
                if(confirm(`Chào ${userInfo.username}, bạn muốn đăng xuất?`)) {
                    localStorage.removeItem('userInfo');
                    if (userInfo.userId) localStorage.removeItem(`chatHistory_${userInfo.userId}`);
                    window.location.reload(); 
                }
            } else {
               // NẾU CHƯA CÓ USER -> BẬT MODAL, LUÔN CHUYỂN VỀ FORM ĐĂNG KÝ
if(authModal) {
    authModal.style.display = 'flex';
    // ✅ THAY ĐỔI: Luôn chuyển sang form Đăng ký (right-panel-active) khi người dùng bấm nút đăng nhập lần đầu.
    if(container) container.classList.add("right-panel-active"); 
}
            }
        }

        // Xử lý nút đóng Modal (nút X)
        if (e.target.closest('#close-auth-modal')) {
            if(authModal) authModal.style.display = 'none';
        }

        // Đóng khi click ra vùng đen
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    // ============================================================
// 4. LOGIC ĐĂNG KÝ (CÓ LOG KIỂM TRA LỖI)
// ============================================================
const formSignup = document.getElementById('form-signup');
if (formSignup) {
    formSignup.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPass = document.getElementById('signup-confirm').value;

        if (password !== confirmPass) { alert("❌ Mật khẩu không khớp!"); return; }

        console.log("🚀 Đang gửi yêu cầu ĐĂNG KÝ lên Server..."); // LOG 1

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role: 'user' })
            });

            const data = await res.json();
            console.log("📩 Server trả về (Đăng ký):", data); // LOG 2: Xem Server trả về gì

            if (res.ok) {
                alert("✅ Đăng ký thành công! Hãy đăng nhập.");
                if (container) container.classList.remove("right-panel-active");
                const loginInput = document.getElementById('login-username');
                if (loginInput) loginInput.value = email;
            } else {
                // 🔥 NẾU LỖI, NÓ SẼ CHẠY VÀO ĐÂY
                console.warn("⚠️ Phát hiện lỗi Đăng ký. Message từ server:", data.message); // LOG 3
                
                // Ưu tiên hiển thị message từ Server
                const msg = data.message || "Lỗi đăng ký không xác định";
                alert("⚠️ THÔNG BÁO: " + msg);
            }
        } catch (err) {
            console.error("❌ Lỗi mạng hoặc code JS:", err);
            alert("❌ Lỗi kết nối Server.");
        }
    });
}

// ============================================================
// 5. LOGIC ĐĂNG NHẬP (CÓ LOG KIỂM TRA LỖI)
// ============================================================
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        console.log("🚀 Đang gửi yêu cầu ĐĂNG NHẬP lên Server...", username); // LOG 1

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password: password })
            });

            const data = await res.json();
            console.log("📩 Server trả về (Đăng nhập):", data); // LOG 2: Xem Server trả về gì

            if (res.ok) {
                localStorage.setItem('userInfo', JSON.stringify({
                    token: data.token, userId: data.userId, username: data.username || username, role: data.role
                }));
                alert(`🎉 Chào mừng quay trở lại!`);
                if (authModal) authModal.style.display = 'none';
                if (data.role === 'admin') window.location.href = '/admin.html';
                else location.reload();
            } else {
                // 🔥 NẾU LỖI, NÓ SẼ CHẠY VÀO ĐÂY
                console.warn("⚠️ Phát hiện lỗi Đăng nhập. Message từ server:", data.message); // LOG 3
                
                // Ưu tiên hiển thị message từ Server
                const msg = data.message || "Sai thông tin đăng nhập";
                alert("⚠️ THÔNG BÁO: " + msg);
            }
        } catch (err) {
            console.error("❌ Lỗi mạng hoặc code JS:", err);
            alert("❌ Lỗi kết nối Server.");
        }
    });
}
    // ==========================================================
// 🔥 XỬ LÝ ĐĂNG NHẬP SỐ ĐIỆN THOẠI (FIX LỖI CLICK) 🔥
// ==========================================================

// Biến toàn cục lưu kết quả xác thực
let confirmationResult = null;

// 1. Hàm khởi tạo Recaptcha (Chỉ chạy khi cần)
const setupRecaptcha = () => {
    // Kiểm tra xem Firebase đã tải chưa
    if (!window.RecaptchaVerifier || !window.firebaseAuth) {
        console.error("Firebase chưa tải xong. Hãy kiểm tra lại mạng hoặc file index.html");
        alert("Lỗi: Thư viện Firebase chưa sẵn sàng.");
        return;
    }

    // Nếu chưa có recaptcha thì tạo mới
    if (!window.recaptchaVerifier) {
        try {
            window.recaptchaVerifier = new window.RecaptchaVerifier(window.firebaseAuth, 'recaptcha-container', {
                'size': 'normal', 
                'callback': (response) => {
                    console.log("Recaptcha đã xác thực thành công!");
                },
                'expired-callback': () => {
                    console.log("Recaptcha hết hạn, vui lòng refresh");
                }
            });
            window.recaptchaVerifier.render().then(widgetId => {
                window.recaptchaWidgetId = widgetId;
            });
        } catch (e) {
            console.error("Lỗi tạo Recaptcha:", e);
        }
    }
};

// 2. LẮNG NGHE SỰ KIỆN CLICK (Dùng Event Delegation cho chắc ăn)
document.addEventListener('click', async (e) => {
    
    // --- A. KHI BẤM NÚT ICON ĐIỆN THOẠI ---
    const btnPhone = e.target.closest('.social.phone'); // Tìm nút có class .social.phone
    if (btnPhone) {
        e.preventDefault();
        console.log("Đã bấm nút điện thoại!");

        const phoneForm = document.getElementById('phone-login-form');
        if (phoneForm) {
            phoneForm.style.display = 'flex'; // Hiện form
            // Ẩn các form cũ đi cho đỡ rối (nếu cần)
            // setTimeout(() => setupRecaptcha(), 500); // Đợi form hiện rồi mới vẽ Recaptcha
            setupRecaptcha();
        } else {
            alert("Lỗi: Không tìm thấy khung đăng nhập SĐT (thiếu HTML id='phone-login-form')");
        }
    }

   // --- B. KHI BẤM NÚT "GỬI MÃ OTP" ---
    if (e.target.id === 'btn-send-otp') {
        let phoneNumber = document.getElementById('phone-number-input').value.trim();
        
        // 👇 TỰ ĐỘNG SỬA LỖI NHẬP SỐ ĐIỆN THOẠI 👇
        if (phoneNumber.startsWith('0')) {
            // Nếu nhập 09xx -> đổi thành +849xx
            phoneNumber = '+84' + phoneNumber.slice(1);
        } else if (!phoneNumber.startsWith('+')) {
            // Nếu nhập 84xx (thiếu dấu +) -> thêm dấu +
            phoneNumber = '+' + phoneNumber;
        }
        
        console.log("Số điện thoại gửi đi:", phoneNumber); // Kiểm tra log xem đúng dạng +84... chưa

        if (!phoneNumber) return alert("Vui lòng nhập số điện thoại!");
        try {
            if (!window.signInWithPhoneNumber) throw new Error("Hàm signInWithPhoneNumber chưa được load");
            
            const appVerifier = window.recaptchaVerifier;
            
            // Gọi Firebase gửi tin nhắn
            confirmationResult = await window.signInWithPhoneNumber(window.firebaseAuth, phoneNumber, appVerifier);
            
            alert(`✅ Đã gửi mã OTP đến ${phoneNumber}`);
            
            // Chuyển sang giao diện nhập mã
            document.getElementById('step-1-phone').style.display = 'none';
            document.getElementById('step-2-otp').style.display = 'block';
            
        } catch (error) {
            console.error("Lỗi gửi SMS:", error);
            alert("Gửi mã thất bại: " + error.message);
            if(window.recaptchaVerifier) window.recaptchaVerifier.clear();
        }
    }

   // --- C. KHI BẤM NÚT "XÁC THỰC" (OTP) ---
if (e.target.id === 'btn-verify-otp') {
    const code = document.getElementById('otp-input').value.trim();
    if (!code) return alert("Vui lòng nhập mã OTP!");

    try {
        const result = await confirmationResult.confirm(code);
        const user = result.user;
        console.log("Xác thực OTP thành công:", user);

        // 🔥 BƯỚC 1: XÁC ĐỊNH ĐANG Ở FORM NÀO
        const container = document.getElementById('auth-container');
        const isRegisterMode = container ? container.classList.contains("right-panel-active") : false;
        const actionType = isRegisterMode ? 'register' : 'login';

        console.log(`✅ Phone OK. Đang gửi về Server với chế độ: ${actionType}`);

        // 🔥 BƯỚC 2: GỌI API VỚI actionType
        const res = await fetch('/api/auth/social-register', { // Luôn dùng endpoint này
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                // Email giả lập từ SĐT
                email: user.phoneNumber.replace('+', '') + "@phone.login", 
                name: "Khách hàng " + user.phoneNumber.slice(-4),
                photo: "",
                provider: "phone",
                uid: user.uid,
                phoneNumber: user.phoneNumber,
                actionType: actionType // <-- GỬI CÁI NÀY ĐI
            })
        });

        const data = await res.json();

        // 🔥 BƯỚC 3: XỬ LÝ PHẢN HỒI
        if (res.ok) {
            localStorage.setItem('userInfo', JSON.stringify({
                token: data.token, userId: data.userId, username: data.username, role: data.role
            }));
            
            if (data.message === 'Đăng ký thành công') { 
                const authModal = document.getElementById('auth-modal');
                if (authModal) authModal.style.display = 'none';
                window.showPasswordSetupModal(data.userId, data.email, data.token);
            } else {
                alert("🎉 Đăng nhập thành công!");
                location.reload();
            }
        } else {
            // Hiển thị thông báo lỗi từ Server (Đúng câu bạn muốn)
            alert("⚠️ Thông báo: " + (data.message || "Lỗi Server"));
        }

    } catch (error) {
        console.error("Lỗi xác thực:", error);
        alert("Mã OTP không đúng hoặc đã hết hạn!");
    }
}

    // --- D. KHI BẤM NÚT QUAY LẠI ---
    if (e.target.closest('#back-to-email')) {
        document.getElementById('phone-login-form').style.display = 'none';
        // Reset trạng thái
        document.getElementById('step-1-phone').style.display = 'block';
        document.getElementById('step-2-otp').style.display = 'none';
    }

// --- E. KHI BẤM NÚT GOOGLE ---
if (e.target.closest('.social.google')) {
    e.preventDefault();
    
    // 1. Lấy nút Google để thao tác giao diện
    const googleBtn = e.target.closest('.social.google');

    // 2. Kiểm tra: Nếu nút đang bị khóa (đang xử lý) thì dừng ngay, không làm gì cả
    if (googleBtn.style.pointerEvents === 'none') return;

    // 3. Khóa nút ngay lập tức (Làm mờ & chặn click)
    googleBtn.style.pointerEvents = 'none';
    googleBtn.style.opacity = '0.5';
    console.log("🔒 Đang xử lý đăng nhập Google...");

    try {
        console.log("Đã bấm nút Google!");

        // --- XÁC ĐỊNH FORM ---
        const container = document.getElementById('auth-container');
        const isRegisterMode = container ? container.classList.contains("right-panel-active") : false;
        const actionType = isRegisterMode ? 'register' : 'login';

        if (!window.GoogleAuthProvider || !window.signInWithPopup) {
             throw new Error("Firebase chưa sẵn sàng.");
        }
        
        const provider = new window.GoogleAuthProvider();
        
        // --- GỌI POPUP GOOGLE ---
        const result = await window.signInWithPopup(window.firebaseAuth, provider);
        const user = result.user;
        
        console.log(`✅ Google OK. Đang gửi về Server với chế độ: ${actionType}`);

        // --- GỌI API SERVER ---
        const res = await fetch('/api/auth/social-register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: user.email,
                name: user.displayName,
                photo: user.photoURL,
                provider: 'google',
                uid: user.uid,
                actionType: actionType
            })
        });

        const data = await res.json();
        
        // --- XỬ LÝ KẾT QUẢ ---
        if (res.ok) {
            localStorage.setItem('userInfo', JSON.stringify({
                token: data.token, userId: data.userId, username: data.username, role: data.role, avatar: data.avatar
            }));
            
            if (data.message === 'Đăng ký thành công') { 
                 const authModal = document.getElementById('auth-modal');
                 if (authModal) authModal.style.display = 'none';
                 // Nếu có hàm showPasswordSetupModal thì gọi, không thì chuyển trang
                 if (typeof window.showPasswordSetupModal === 'function') {
                    window.showPasswordSetupModal(data.userId, data.email, data.token);
                 } else {
                    window.location.href = '/index.html';
                 }
            } else {
                 alert(`🎉 Chào mừng ${data.username}!`);
                 window.location.href = '/index.html'; 
            }
        } else {
            alert("⚠️ Thông báo: " + (data.message || "Thất bại"));
        }
        
    } catch (err) {
        console.error("❌ Lỗi Google:", err);
        // Bỏ qua lỗi do người dùng tự tắt popup hoặc bấm hủy (tránh spam alert)
        const ignoreErrors = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (!ignoreErrors.includes(err.code)) {
            alert("Lỗi: " + err.message);
        }
    } finally {
        // 4. MỞ KHÓA NÚT (Quan trọng nhất: Luôn chạy dù thành công hay thất bại)
        if (googleBtn) {
            googleBtn.style.pointerEvents = 'auto';
            googleBtn.style.opacity = '1';
        }
        console.log("🔓 Đã mở khóa nút Google.");
    }
}
  

});
// ==========================================================
// 🔥 LOGIC QUÊN MẬT KHẨU (PHIÊN BẢN GLOBAL - CHẮC CHẮN CHẠY) 🔥
// ==========================================================

// 1. Mở Modal
window.openForgotModal = function() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'none';

    const forgotModal = document.getElementById('forgot-password-modal');
    if (forgotModal) {
        forgotModal.style.display = 'flex';
        // Reset giao diện về bước 1
        if(document.getElementById('forgot-step-1')) document.getElementById('forgot-step-1').style.display = 'block';
        if(document.getElementById('forgot-step-2')) document.getElementById('forgot-step-2').style.display = 'none';
        
        // Xóa dữ liệu cũ
        document.getElementById('forgot-email').value = '';
        document.getElementById('reset-otp').value = '';
        document.getElementById('reset-new-pass').value = '';
    }
}

// 2. Đóng Modal
window.closeForgotModal = function() {
    const forgotModal = document.getElementById('forgot-password-modal');
    if (forgotModal) forgotModal.style.display = 'none';
}

// 3. Quay lại bước 1
window.backToStep1 = function() {
    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';
}

// 4. Xử lý Gửi OTP (Gán vào window để sửa lỗi ReferenceError)
window.handleSendOtp = async function() {
    console.log("Bắt đầu gửi OTP..."); // Log kiểm tra
    
    const emailInput = document.getElementById('forgot-email');
    const email = emailInput.value.trim();
    
    // Tìm nút bấm để làm hiệu ứng loading (nếu có)
    const btn = document.querySelector('#forgot-step-1 button');
    
    if (!email) {
        alert("Vui lòng nhập email!");
        return;
    }

    // Hiệu ứng loading
    let originalText = "Gửi Mã OTP";
    if (btn) {
        originalText = btn.textContent;
        btn.textContent = "Đang gửi...";
        btn.disabled = true;
    }

    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
            alert("✅ Đã gửi mã thành công! Vui lòng kiểm tra email.");
            // Chuyển sang bước 2
            document.getElementById('forgot-step-1').style.display = 'none';
            document.getElementById('forgot-step-2').style.display = 'block';
        } else {
            alert("⚠️ " + (data.message || "Lỗi gửi mail"));
        }
    } catch (e) {
        console.error(e);
        alert("❌ Lỗi kết nối Server");
    } finally {
        // Trả lại nút bấm
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// 5. Xử lý Đổi Mật Khẩu
window.handleSubmitReset = async function() {
    const email = document.getElementById('forgot-email').value.trim();
    const otp = document.getElementById('reset-otp').value.trim();
    const newPassword = document.getElementById('reset-new-pass').value;

    if (!otp || !newPassword) return alert("Vui lòng nhập đủ Mã OTP và Mật khẩu mới!");

    try {
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await res.json();

        if (res.ok) {
            alert("🎉 Đổi mật khẩu thành công! Hãy đăng nhập lại.");
            window.closeForgotModal();
            
            // Mở lại modal đăng nhập
            const authModal = document.getElementById('auth-modal');
            if (authModal) authModal.style.display = 'flex';
        } else {
            alert("⚠️ " + (data.message || "Mã OTP không đúng"));
        }
    } catch (e) {
        console.error(e);
        alert("❌ Lỗi Server");
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tìm nút đổi màu (Nó sẽ tự tìm thấy dù bạn đang ở trang Admin hay User)
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Nếu trang hiện tại không có nút này (ví dụ trang login) thì không làm gì cả để tránh lỗi
    if (!themeToggleBtn) return;

    // 2. Kiểm tra bộ nhớ xem khách từng chọn Dark Mode chưa
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '☀️'; // Đổi thành mặt trời
    }


});