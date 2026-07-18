// Permissionless multi-select contact picker.
//
// CNContactPickerViewController is Apple's out-of-process picker: it shows the
// user's FULL contact list (with search) without the app holding any contacts
// permission, and hands back only the contacts the user explicitly checks off.
// Implementing the plural `didSelect contacts:` delegate method is what turns
// on multi-select mode. expo-contacts only wraps the single-select variant,
// hence this local module.
import ExpoModulesCore
import ContactsUI

public class ContactMultiPickerModule: Module {
  // CNContactPickerViewController keeps only a weak reference to its delegate,
  // so the module holds it strongly for the duration of the presentation.
  private var pickerDelegate: MultiPickerDelegate?

  public func definition() -> ModuleDefinition {
    Name("ContactMultiPicker")

    // Resolves with an array of { name, phoneNumbers: [{ number, label }] }.
    // Cancelling resolves with an empty array (not a rejection).
    AsyncFunction("presentMultiPickerAsync") { (promise: Promise) in
      DispatchQueue.main.async { [weak self] in
        guard let self = self else {
          promise.reject("ERR_MODULE_GONE", "Module was deallocated")
          return
        }
        guard self.pickerDelegate == nil else {
          promise.reject("ERR_PICKER_BUSY", "A contact picker is already being presented")
          return
        }
        guard let currentVc = self.appContext?.utilities?.currentViewController() else {
          promise.reject("ERR_NO_VIEW_CONTROLLER", "No view controller to present from")
          return
        }

        let picker = CNContactPickerViewController()
        // Only contacts that can actually receive a text are selectable.
        picker.predicateForEnablingContact = NSPredicate(format: "phoneNumbers.@count > 0")

        let delegate = MultiPickerDelegate { [weak self] contacts in
          let mapped: [[String: Any]] = contacts.map { contact in
            var name = [contact.givenName, contact.familyName]
              .filter { !$0.isEmpty }
              .joined(separator: " ")
            if name.isEmpty { name = contact.organizationName }
            let phones: [[String: String]] = contact.phoneNumbers.map { labeled in
              [
                "number": labeled.value.stringValue,
                "label": labeled.label.map { CNLabeledValue<NSString>.localizedString(forLabel: $0) } ?? "",
              ]
            }
            return ["name": name, "phoneNumbers": phones]
          }
          promise.resolve(mapped)
          self?.pickerDelegate = nil
        }
        self.pickerDelegate = delegate
        picker.delegate = delegate
        currentVc.present(picker, animated: true)
      }
    }
  }
}

private class MultiPickerDelegate: NSObject, CNContactPickerDelegate {
  private let onDone: ([CNContact]) -> Void

  init(onDone: @escaping ([CNContact]) -> Void) {
    self.onDone = onDone
  }

  // The plural variant — its presence is what enables multi-select in the picker.
  func contactPicker(_ picker: CNContactPickerViewController, didSelect contacts: [CNContact]) {
    onDone(contacts)
  }

  func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
    onDone([])
  }
}
