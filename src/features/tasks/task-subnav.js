// Giữ tương thích: thanh chuyển Danh sách · Ưu tiên · Lịch.
import { subnav, GROUPS } from '../../ui/subnav.js';

export const TASK_VIEWS = GROUPS.tasks.map(([k]) => k);
export const taskSubnav = (active) => subnav('tasks', active);
