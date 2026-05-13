package np.com.abhishekojha.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.notificationservice.dto.InviteEmailRequest;
import np.com.abhishekojha.notificationservice.dto.ReminderEmailRequest;
import np.com.abhishekojha.notificationservice.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/notify")
@RequiredArgsConstructor
public class NotificationController {

    private final EmailService emailService;

    @PostMapping("/invitation")
    public ResponseEntity<Void> sendInvitation(@RequestBody InviteEmailRequest req) {
        emailService.sendInvitation(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reminder")
    public ResponseEntity<Void> sendReminder(@RequestBody ReminderEmailRequest req) {
        emailService.sendReminder(req);
        return ResponseEntity.noContent().build();
    }
}
