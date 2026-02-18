"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StaffRole = "RESTAURANT_ADMIN" | "MANAGER" | "CASHIER" | "WAITER" | "KITCHEN" | "INVENTORY";

type StaffRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
};

type ShiftRow = {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  staff?: { full_name?: string | null; email?: string | null; role?: string | null } | null;
};

const roleOptions: StaffRole[] = ["MANAGER", "CASHIER", "WAITER", "KITCHEN", "INVENTORY"];
const dayOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("WAITER");
  const [shiftStaffId, setShiftStaffId] = useState("");
  const [shiftDay, setShiftDay] = useState("1");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [staffRes, shiftRes] = await Promise.all([fetch("/api/staff"), fetch("/api/staff/shifts")]);

    const staffJson = (await staffRes.json()) as { success: boolean; data?: StaffRow[]; error?: string };
    const shiftJson = (await shiftRes.json()) as { success: boolean; data?: ShiftRow[]; error?: string };

    if (!staffJson.success || !staffJson.data) {
      setStatus(staffJson.error ?? "Failed to load staff");
      return;
    }

    setStaff(staffJson.data);
    if (!shiftStaffId && staffJson.data.length) {
      setShiftStaffId(staffJson.data[0].id);
    }

    if (shiftJson.success && shiftJson.data) {
      setShifts(shiftJson.data);
    }
  }, [shiftStaffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email,
        role
      })
    });

    const json = (await response.json()) as { success: boolean; data?: StaffRow; error?: string };

    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to create staff user");
      return;
    }

    setStatus(`Created ${json.data.full_name} and sent invite email`);
    setFullName("");
    setEmail("");
    setRole("WAITER");
    await load();
  };

  const updateRole = async (staffId: string, nextRole: StaffRole) => {
    const response = await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: staffId, role: nextRole })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `Role updated to ${nextRole}` : json.error ?? "Role update failed");
    if (json.success) await load();
  };

  const toggleActive = async (row: StaffRow) => {
    const response = await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: row.id, is_active: !row.is_active })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `${row.full_name} ${row.is_active ? "deactivated" : "activated"}` : json.error ?? "Update failed");
    if (json.success) await load();
  };

  const createShift = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch("/api/staff/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_id: shiftStaffId,
        day_of_week: Number(shiftDay),
        start_time: shiftStart,
        end_time: shiftEnd
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Shift created" : json.error ?? "Failed to create shift");
    if (json.success) await load();
  };

  const deleteShift = async (shiftId: string) => {
    const response = await fetch("/api/staff/shifts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Shift removed" : json.error ?? "Failed to remove shift");
    if (json.success) await load();
  };

  const resendInvite = async (staffId: string) => {
    const response = await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: staffId })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Invite email resent" : json.error ?? "Failed to resend invite");
  };

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-xl font-bold">Staff Management</h1>
        <form className="mt-4 grid gap-2 md:grid-cols-4" onSubmit={onCreate}>
          <input
            className="rounded border p-2 text-sm"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <input
            className="rounded border p-2 text-sm"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select className="rounded border p-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
            {roleOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Button type="submit">Add Staff</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold">Shift Scheduling</h2>
        <form className="mt-3 grid gap-2 md:grid-cols-5" onSubmit={createShift}>
          <select className="rounded border p-2 text-sm" value={shiftStaffId} onChange={(e) => setShiftStaffId(e.target.value)}>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.role})
              </option>
            ))}
          </select>
          <select className="rounded border p-2 text-sm" value={shiftDay} onChange={(e) => setShiftDay(e.target.value)}>
            {dayOptions.map((day, index) => (
              <option key={day} value={String(index)}>
                {day}
              </option>
            ))}
          </select>
          <input className="rounded border p-2 text-sm" type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} required />
          <input className="rounded border p-2 text-sm" type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} required />
          <Button type="submit">Add Shift</Button>
        </form>

        <div className="mt-3 space-y-2 text-sm">
          {shifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between rounded border p-2">
              <span>
                {shift.staff?.full_name ?? shift.staff_id} • {dayOptions[shift.day_of_week]} • {shift.start_time.slice(0, 5)}-{shift.end_time.slice(0, 5)}
              </span>
              <Button variant="ghost" onClick={() => void deleteShift(shift.id)}>
                Remove
              </Button>
            </div>
          ))}
          {!shifts.length && <p className="text-gray-500">No shifts scheduled.</p>}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="p-2">{member.full_name}</td>
                  <td className="p-2">{member.email}</td>
                  <td className="p-2">
                    <select
                      className="rounded border p-1 text-xs"
                      value={member.role}
                      onChange={(e) => void updateRole(member.id, e.target.value as StaffRole)}
                    >
                      {["RESTAURANT_ADMIN", ...roleOptions].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">{member.is_active ? "Active" : "Inactive"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => void toggleActive(member)}>
                        {member.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="secondary" onClick={() => void resendInvite(member.id)}>
                        Resend Invite
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {status && <p className="text-sm text-gray-600">{status}</p>}
    </div>
  );
}
