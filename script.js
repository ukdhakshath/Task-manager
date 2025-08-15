document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const taskInput = document.getElementById('task-input');
  const dueDateInput = document.getElementById('due-date');
  const prioritySelect = document.getElementById('priority');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const searchInput = document.getElementById('search-input');
  const modal = document.getElementById('modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  const toast = document.getElementById('toast');

  // State
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  let currentFilter = 'all';
  let taskToDelete = null;

  // Initialize
  renderTasks();

  // Event Listeners
  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => e.key === 'Enter' && addTask());
  searchInput.addEventListener('input', searchTasks);
  filterBtns.forEach(btn => btn.addEventListener('click', applyFilter));
  themeToggle.addEventListener('click', toggleTheme);
  confirmDeleteBtn.addEventListener('click', confirmDelete);
  cancelDeleteBtn.addEventListener('click', closeModal);

  // Drag & Drop
  setupDragAndDrop();

  // Functions
  function addTask() {
    const taskText = taskInput.value.trim();
    if (!taskText) return;

    const newTask = {
      id: Date.now(),
      text: taskText,
      dueDate: dueDateInput.value || 'No due date',
      priority: prioritySelect.value,
      completed: false
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    showToast('Task added successfully!', 'success');
    taskInput.value = '';
    dueDateInput.value = '';
  }

  function renderTasks() {
    taskList.innerHTML = '';
    const filteredTasks = filterTasks();
    
    if (filteredTasks.length === 0) {
      taskList.innerHTML = '<p class="empty-message">No tasks found</p>';
      return;
    }

    filteredTasks.forEach((task, index) => {
      const taskItem = document.createElement('li');
      taskItem.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority}`;
      taskItem.setAttribute('draggable', 'true');
      taskItem.dataset.id = task.id;
      taskItem.style.animationDelay = `${index * 0.1}s`;

      taskItem.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <span class="priority ${task.priority}">${task.priority}</span>
        <span class="task-text">${task.text}</span>
        <span class="task-due">${task.dueDate}</span>
        <div class="task-actions">
          <button class="edit-btn"><i class="fas fa-edit"></i></button>
          <button class="delete-btn"><i class="fas fa-trash"></i></button>
        </div>
      `;

      taskList.appendChild(taskItem);

      // Add event listeners
      const checkbox = taskItem.querySelector('.task-checkbox');
      const editBtn = taskItem.querySelector('.edit-btn');
      const deleteBtn = taskItem.querySelector('.delete-btn');

      checkbox.addEventListener('change', () => toggleComplete(task.id));
      editBtn.addEventListener('click', () => editTask(task.id));
      deleteBtn.addEventListener('click', () => promptDelete(task.id));
    });
  }

  function filterTasks() {
    let filtered = [...tasks];
    
    // Apply filter
    if (currentFilter === 'pending') {
      filtered = filtered.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    }

    // Apply search
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.text.toLowerCase().includes(searchTerm) || 
        task.dueDate.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  function applyFilter(e) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    renderTasks();
  }

  function searchTasks() {
    renderTasks();
  }

  function toggleComplete(id) {
    tasks = tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    renderTasks();
    showToast('Task updated!', 'success');
  }

  function editTask(id) {
    const task = tasks.find(task => task.id === id);
    const newText = prompt('Edit task:', task.text);
    if (newText !== null && newText.trim() !== '') {
      task.text = newText.trim();
      saveTasks();
      renderTasks();
      showToast('Task updated!', 'success');
    }
  }

  function promptDelete(id) {
    taskToDelete = id;
    modal.classList.add('active');
  }

  function confirmDelete() {
    tasks = tasks.filter(task => task.id !== taskToDelete);
    saveTasks();
    renderTasks();
    closeModal();
    showToast('Task deleted!', 'error');
  }

  function closeModal() {
    modal.classList.remove('active');
    taskToDelete = null;
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
  }

  function showToast(message, type) {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function setupDragAndDrop() {
    let draggedItem = null;

    taskList.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('task-item')) {
        draggedItem = e.target;
        setTimeout(() => {
          draggedItem.classList.add('dragging');
        }, 0);
      }
    });

    taskList.addEventListener('dragend', () => {
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
      }
    });

    taskList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(taskList, e.clientY);
      const currentItem = document.querySelector('.dragging');
      
      if (!currentItem) return;

      if (afterElement == null) {
        taskList.appendChild(currentItem);
      } else {
        taskList.insertBefore(currentItem, afterElement);
      }
      
      // Update tasks order in localStorage
      updateTasksOrder();
    });

    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
      
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function updateTasksOrder() {
      const newOrder = [...taskList.children].map(item => parseInt(item.dataset.id));
      tasks.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
      saveTasks();
    }
  }
});