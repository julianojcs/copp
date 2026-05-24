import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
	cleanup()
})

// happy-dom doesn't implement the Pointer Capture API that Radix UI's
// floating primitives (DropdownMenu, Select, Popover) probe before
// opening. Stubbing these to no-ops lets the Radix triggers respond
// to click/keyboard events in tests.
// See: https://github.com/radix-ui/primitives/issues/1822
if (typeof HTMLElement !== 'undefined') {
	if (!HTMLElement.prototype.hasPointerCapture) {
		HTMLElement.prototype.hasPointerCapture = () => false
	}
	if (!HTMLElement.prototype.releasePointerCapture) {
		HTMLElement.prototype.releasePointerCapture = () => {}
	}
	if (!HTMLElement.prototype.setPointerCapture) {
		HTMLElement.prototype.setPointerCapture = () => {}
	}
	if (!HTMLElement.prototype.scrollIntoView) {
		HTMLElement.prototype.scrollIntoView = () => {}
	}
}
